#!/usr/bin/env python3
"""Build an offline-capable bilingual academic site using only the Python standard library.

Source of truth: data/profile.json. Generated files go to dist/.
No network access, bundler, node_modules, or template dependency is required.
"""
from __future__ import annotations

import argparse
import html
import json
import re
import shutil
from pathlib import Path
from urllib.parse import quote, urlparse
import sys
sys.path.insert(0, str(Path(__file__).resolve().parent))
from experience import TEXT, scene_config, avatar_html
from visitors import visitor_config, visitors_html

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "dist"

ICONS = {
    "arrow": '<path d="M5 19 19 5M5 5h14v14"/>',
    "external": '<path d="M9 5H5v14h14v-4M13 5h6v6M10 14l9-9"/>',
    "up": '<path d="m5 12 7-7 7 7M12 5v14"/>',
    "pin": '<path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2.4"/>',
    "sun": '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
    "moon": '<path d="M20.9 13a9 9 0 0 1-9.9-9.9A9 9 0 1 0 20.9 13Z"/>',
    "menu": '<path d="M4 7h16M4 12h16M4 17h16"/>',
    "pause": '<path d="M9 6v12M15 6v12"/>',
    "download": '<path d="M12 3v12m-5-5 5 5 5-5M4 16v4h16v-4"/>',
    "search": '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/>',
    "copy": '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V4H4v12h4"/>',
    "close": '<path d="m6 6 12 12M6 18 18 6"/>',
}

def icon(name: str) -> str:
    return '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICONS[name] + '</svg>'

def esc(value: object) -> str:
    return html.escape(str(value), quote=True)

def tr(value: object, lang: str) -> str:
    if isinstance(value, dict):
        return str(value.get(lang, value.get("en", "")))
    return str(value)

def safe_json(value: object) -> str:
    return json.dumps(value, ensure_ascii=False).replace("<", "\\u003c").replace(">", "\\u003e").replace("&", "\\u0026")

def validate(data: dict) -> None:
    for key in ["name", "email", "links", "education", "experience", "publications", "research", "updated"]:
        if key not in data:
            raise ValueError(f"Missing required profile field: {key}")
    if not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", data["email"]):
        raise ValueError("profile.email must be a valid email address")
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", data["updated"]):
        raise ValueError("profile.updated must use YYYY-MM-DD")
    for field, value in data["links"].items():
        validate_url(value, f"links.{field}")
    seen: set[str] = set()
    keys: set[str] = set()
    for paper in data["publications"]:
        for required in ["id", "title", "authors", "year", "venue", "shortVenue", "type", "status", "domain", "firstAuthor", "citationKey", "summary", "note"]:
            if required not in paper:
                raise ValueError(f"Publication missing {required}: {paper.get('id', '?')}")
        pid = paper["id"]
        if not re.fullmatch(r"[a-z][a-z0-9-]*", pid) or pid in seen:
            raise ValueError(f"Publication id must be unique and URL-safe: {pid}")
        if not re.fullmatch(r"[a-zA-Z0-9_-]+", paper["citationKey"]) or paper["citationKey"] in keys:
            raise ValueError(f"Invalid or duplicate BibTeX key: {paper['citationKey']}")
        if not paper["authors"] or not isinstance(paper["year"], int):
            raise ValueError(f"Invalid authors/year in {pid}")
        if paper["type"] not in {"article", "inproceedings", "misc"}:
            raise ValueError(f"Unsupported BibTeX type in {pid}")
        if paper["status"] not in {"accepted", "published", "preprint", "under-review"}:
            raise ValueError(f"Unsupported publication status in {pid}")
        for field in ["url", "pdf", "code", "preprint"]:
            if paper.get(field):
                validate_url(paper[field], f"{pid}.{field}")
        if paper.get("doi") and not re.fullmatch(r"10\.\d{4,9}/[^\s]+", paper["doi"]):
            raise ValueError(f"Malformed DOI in {pid}")
        seen.add(pid)
        keys.add(paper["citationKey"])
    for news in data.get("news", []):
        target = news["target"]
        if target.startswith("pub-") and target[4:] not in seen:
            raise ValueError(f"News references missing paper: {target}")

def validate_url(value: str, name: str) -> None:
    parsed = urlparse(value)
    if parsed.scheme != "https" or not parsed.netloc or any(c in value for c in ['"', "<", ">", "\n", "\r"]):
        raise ValueError(f"{name} must be an absolute HTTPS URL")

def render(template: str, values: dict[str, str]) -> str:
    def replace(match: re.Match) -> str:
        key = match.group(1)
        if key not in values:
            raise ValueError(f"Unknown template placeholder: {key}")
        return values[key]
    return re.sub(r"\{\{([a-zA-Z0-9_]+)\}\}", replace, template)

def bib_escape(value: str) -> str:
    mapping = {"&": r"\&", "%": r"\%", "_": r"\_", "#": r"\#", "$": r"\$", "{": r"\{", "}": r"\}", "ğ": r"{\u{g}}", "’": "'", "–": "--", "—": "---"}
    return "".join(mapping.get(c, c) for c in value)

def bibtex(paper: dict) -> str:
    fields = [("author", " and ".join(paper["authors"])), ("title", paper["title"])]
    venue_field = "journal" if paper["type"] == "article" else "booktitle" if paper["type"] == "inproceedings" else "howpublished"
    fields.extend([(venue_field, paper["venue"]), ("year", str(paper["year"]))])
    for field, source in [("volume", "volume"), ("pages", "article"), ("doi", "doi"), ("url", "url")]:
        if paper.get(source):
            fields.append((field, paper[source]))
    if paper["status"] == "accepted":
        fields.append(("note", "Accepted for publication"))
    # Preserve case-sensitive acronyms and model names in the title.
    body = []
    for key, value in fields:
        escaped = bib_escape(value)
        if key == "title":
            escaped = "{" + escaped + "}"
        body.append(f"  {key} = {{{escaped}}}")
    return f"@{paper['type']}{{{paper['citationKey']},\n" + ",\n".join(body) + "\n}"

def diagram(kind: str, cls: str = "research-diagram") -> str:
    """Small illustrative vector marks, not empirical plots or paper figures."""
    pieces = {
        "mobility": '<path class="diagram-grid" d="M5 25h150M5 50h150M5 75h150M30 10v80M60 10v80M90 10v80M120 10v80"/><path class="diagram-accent" d="M15 76h35V49h40V25h49"/><circle cx="15" cy="76" r="4"/><circle cx="50" cy="49" r="4"/><circle cx="90" cy="25" r="4"/><circle class="diagram-fill" cx="139" cy="25" r="5"/>',
        "agents": '<path class="diagram-grid" d="m30 25 50 22 52-25M30 25l5 51 45-29 50 29 2-54M35 76h95"/><path class="diagram-accent" d="m30 25 50 22 50 29"/><rect x="18" y="13" width="24" height="24" rx="6"/><rect x="68" y="35" width="24" height="24" rx="6"/><rect x="120" y="10" width="24" height="24" rx="6"/><rect x="23" y="64" width="24" height="24" rx="6"/><rect x="118" y="64" width="24" height="24" rx="6"/><circle class="diagram-fill" cx="80" cy="47" r="3"/>',
        "interpretability": '<rect class="diagram-grid" x="11" y="21" width="49" height="59" rx="3"/><path class="diagram-grid" d="M20 31h30M20 43h30M20 55h30M20 67h30M80 50h16"/><path class="diagram-accent" d="M22 43h21M72 50h26m-6-5 6 5-6 5"/><path d="M112 68V44m15 24V31m15 37V16"/><circle class="diagram-fill" cx="112" cy="44" r="3"/><circle class="diagram-fill" cx="127" cy="31" r="3"/><circle class="diagram-fill" cx="142" cy="16" r="3"/>',
        "ieor": '<path class="diagram-grid" d="M20 12v72h128M20 55l35-34 44 25 47-12M30 75l30-25 40 10 44-16"/><path class="diagram-accent" d="M33 22q12 52 101 52"/><circle class="diagram-fill" cx="76" cy="61" r="5"/><path class="diagram-grid" d="M76 61v23M20 61h56"/>',
        "freight": '<path class="diagram-grid" d="M10 22h140M10 50h140M10 78h140M30 10v78M78 10v78M130 10v78"/><path class="diagram-accent" d="M20 78h58V22h52"/><rect x="16" y="70" width="10" height="10"/><circle cx="130" cy="22" r="5"/><path d="M90 56h29v14H90zM119 60h12l7 10h-19M97 70v5m34-5v5"/>',
        "causal": '<path class="diagram-grid" d="m22 25 56 25-40 30M78 50l55-26M78 50l49 30"/><path class="diagram-accent" d="m22 25 56 25 49 30"/><circle cx="22" cy="25" r="7"/><circle cx="78" cy="50" r="9"/><circle cx="38" cy="80" r="6"/><circle cx="133" cy="24" r="6"/><circle class="diagram-fill" cx="127" cy="80" r="6"/>',
        "heat": '<path class="diagram-grid" d="M20 83V14M20 83h130"/><path class="diagram-accent" d="M20 65 42 57 62 29 83 45 106 22 146 32"/><path d="M20 73 42 62 62 64 83 60 106 57 146 64"/><circle cx="117" cy="23" r="9"/><path d="M117 8v-5m15 20h5M102 23h-5m20 15v5"/>',
        "lbs": '<path class="diagram-grid" d="M10 25h140M10 50h140M10 75h140M30 10v80M70 10v80M110 10v80"/><circle cx="34" cy="29" r="4"/><circle cx="42" cy="48" r="3"/><circle cx="81" cy="63" r="4"/><circle cx="113" cy="26" r="3"/><circle cx="96" cy="40" r="4"/><circle cx="123" cy="70" r="3"/><circle class="diagram-accent" cx="74" cy="44" r="30"/>',
        "gan": '<path class="diagram-grid" d="M25 10q90 35 0 80M135 10q-90 35 0 80M38 17h84M53 30h54M64 45h31M56 60h48M37 78h86"/><path class="diagram-accent" d="M25 10q90 35 0 80"/><circle class="diagram-fill" cx="70" cy="45" r="4"/>',
    }
    return f'<svg class="{cls}" viewBox="0 0 160 100" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{pieces.get(kind, pieces["mobility"])}</svg>'

UI = {
  "en": {
    "skip": "Skip to content",
    "home": "Home",
    "navigation": "Main navigation",
    "about_label": "About",
    "research_label": "Research",
    "publications_label": "Publications",
    "journey_label": "Path",
    "contact_label": "Contact",
    "say_hello": "Say hello",
    "language_label": "中文",
    "language_aria": "切换到中文",
    "theme_label": "Switch color theme",
    "menu_label": "Open navigation",
    "explore_work": "Explore my work",
    "view_cv": "View CV",
    "updates_label": "NEWS / RESEARCH LOG",
    "news_headline": "Recent signals.",
    "news_kicker": "A timeline of selected publications and acceptances.",
    "news_count": "05 PAPERS",
    "profiles_label": "Academic profiles",
    "scholar_aria": "Google Scholar (opens in new tab)",
    "linkedin_aria": "LinkedIn (opens in new tab)",
    "github_aria": "GitHub (opens in new tab)",
    "timeline_view_all": "All publications",
    "about_title": "About.",
    "advisor_link_label": "Prof. Jiawei Wang",
    "full_cv": "Full curriculum vitae",
    "research_title": "Research interests.",
    "research_intro": "Different perspectives on one question: how can we make intelligent systems understand the way we move?",
    "research_note": "Research interests and directions I am exploring—not claims of completed results.",
    "publications_title": "Publication",
    "filter_aria": "Filter publications",
    "search_label": "Search publications",
    "search_placeholder": "Search papers…",
    "empty_text": "No papers match this search.",
    "reset_label": "Reset filters",
    "publication_note": "My name is highlighted. Accepted papers are distinguished from published journal articles. Bibliographic details were last reviewed on October 6, 2026.",
    "journey_title": "Path.",
    "education_label": "Education",
    "experience_label": "Research & teaching",
    "contact_title": "Let’s connect.",
    "contact_intro": "Interested in language models, mobility, agents, or interpretable decision-making? I welcome research conversations and collaboration.",
    "copy_email_label": "Copy email",
    "footer_label": "Intelligence in motion",
    "updated_label": "Updated",
    "back_top": "Back to top",
    "all": "All",
    "first": "First author",
    "transportation": "Transportation",
    "other": "Other",
    "paper": "Paper",
    "preprint": "Preprint",
    "code": "Code",
    "pdf": "PDF",
    "copied": "Copied to clipboard.",
    "copyFailed": "Automatic copy is unavailable. The text is selected; press Ctrl+C or ⌘C.",
    "results": "{shown} of {total} papers shown.",
    "openMenu": "Open navigation",
    "closeMenu": "Close navigation",
    "switchedLight": "Light theme enabled",
    "switchedDark": "Dark theme enabled",
    "motion_preference": "Reduce motion"
  },
  "zh": {
    "skip": "跳转到正文",
    "home": "首页",
    "navigation": "主导航",
    "about_label": "关于",
    "research_label": "研究方向",
    "publications_label": "论文成果",
    "journey_label": "历程",
    "contact_label": "联系",
    "say_hello": "联系我",
    "language_label": "EN",
    "language_aria": "Switch to English",
    "theme_label": "切换明暗主题",
    "menu_label": "打开导航",
    "explore_work": "浏览研究成果",
    "view_cv": "查看简历",
    "updates_label": "动态 / 研究时间线",
    "news_headline": "近期成果。",
    "news_kicker": "发表与录用论文的时间线。",
    "news_count": "05 篇论文",
    "profiles_label": "学术主页与社交链接",
    "scholar_aria": "Google Scholar（在新标签页打开）",
    "linkedin_aria": "领英（在新标签页打开）",
    "github_aria": "GitHub（在新标签页打开）",
    "timeline_view_all": "查看全部论文",
    "about_title": "关于我。",
    "advisor_link_label": "王家伟教授",
    "full_cv": "完整学术简历",
    "research_title": "研究兴趣。",
    "research_intro": "从不同视角探索同一个问题：如何让智能系统理解我们的移动行为？",
    "research_note": "以上为正在探索的研究兴趣与方向，不代表已经完成的研究成果。",
    "publications_title": "论文成果",
    "filter_aria": "筛选论文",
    "search_label": "搜索论文",
    "search_placeholder": "搜索论文…",
    "empty_text": "没有找到匹配的论文。",
    "reset_label": "重置筛选",
    "publication_note": "我的姓名已加粗。已录用会议论文与已发表期刊论文分别标注。书目信息最后核对于 2026 年 10 月 6 日。",
    "journey_title": "历程。",
    "education_label": "教育经历",
    "experience_label": "研究与教学",
    "contact_title": "保持联系。",
    "contact_intro": "欢迎围绕语言模型、移动行为、智能体与可解释决策开展学术交流与合作。",
    "copy_email_label": "复制邮箱",
    "footer_label": "理解移动，理解智能",
    "updated_label": "更新于",
    "back_top": "回到顶部",
    "all": "全部",
    "first": "第一作者",
    "transportation": "交通领域",
    "other": "其他领域",
    "paper": "论文",
    "preprint": "预印本",
    "code": "代码",
    "pdf": "PDF",
    "copied": "已复制到剪贴板。",
    "copyFailed": "无法自动复制，文本已选中。请按 Ctrl+C 或 ⌘C。",
    "results": "显示 {shown} / {total} 篇论文。",
    "openMenu": "打开导航",
    "closeMenu": "关闭导航",
    "switchedLight": "已切换为浅色主题",
    "switchedDark": "已切换为深色主题",
    "motion_preference": "减少动态效果"
  }
}

def author_html(paper: dict, name: str) -> str:
    return ", ".join(f'<strong>{esc(a)}</strong>' if a == name else esc(a) for a in paper["authors"])

def external_link(url: str, label: str, cls: str = "text-link") -> str:
    return f'<a class="{cls}" href="{esc(url)}" target="_blank" rel="noopener noreferrer">{esc(label)}{icon("external")}</a>'

def publication_html(p: dict, lang: str, data: dict) -> str:
    u = UI[lang]
    links = []
    if p["status"] != "accepted" and p.get("url"):
        links.append(external_link(p["url"], u["paper"], "paper-link"))
    for field in ["preprint", "pdf", "code"]:
        if p["status"] != "accepted" and p.get(field):
            links.append(external_link(p[field], u[field], "paper-link secondary"))
    search = " ".join([p["title"], *p["authors"], p["venue"], p["shortVenue"], str(p["year"]), tr(p["summary"], "en"), tr(p["summary"], "zh")])
    return f'''<article class="publication" id="pub-{esc(p['id'])}" data-first="{str(p['firstAuthor']).lower()}" data-domain="{esc(p['domain'])}" data-search="{esc(search)}">
    <div class="paper-body"><div class="paper-meta"><span class="venue-badge {'accepted' if p['status'] == 'accepted' else ''}">{esc(p['shortVenue'])}</span><span class="paper-status">{esc(tr(p['note'], lang))}</span></div><h3>{esc(p['title'])}</h3><p class="paper-authors">{author_html(p, data['name'])}</p><p class="paper-summary">{esc(tr(p['summary'], lang))}</p><div class="paper-links">{''.join(links)}</div></div></article>'''

def page_values(data: dict, lang: str, site_url: str) -> dict[str, str]:
    u = dict(UI[lang])
    values = {k: esc(v).replace("\n", "<br>") for k, v in u.items()}
    for name in ICONS:
        values[name + "_icon"] = icon(name)
    name = "index.html" if lang == "en" else "zh.html"
    values.update({
        "html_lang": "en" if lang == "en" else "zh-CN",
        "page_title": "Yuteng Zhang — LLMs, Mobility & Interpretable Intelligence" if lang == "en" else "Yuteng Zhang — 语言模型、移动行为与可解释智能",
        "description": esc(tr(data["description"], lang)),
        "alternate_page": "zh.html" if lang == "en" else "index.html",
        "alternate_lang": "zh-CN" if lang == "en" else "en",
        "email": esc(data["email"]), "updated": data["updated"], "year": data["updated"][:4], "pub_count": f'{len(data["publications"]):02d}',
        "brand_svg": (ROOT / "public/assets/brand-y.svg").read_text(encoding="utf-8"),
        "brand_role": esc(tr(data["hero"]["eyebrow"], lang)),
        "seo_links": "",
    })
    for key in ["scholar", "linkedin", "github", "advisor"]:
        values[key + "_url"] = esc(data["links"][key])
    for key, target in [("eyebrow", "hero_eyebrow"), ("line", "hero_line"), ("intro", "hero_intro"), ("location", "hero_location")]:
        values[target] = esc(tr(data["hero"][key], lang))
        if key == "line":
            parts = values[target].split("\n", 1)
            values[target] = parts[0] + ("<br><span class=\"hero-line-accent\">" + parts[1] + "</span>" if len(parts)>1 else "")
    def about_rich(paragraph):
        escaped = esc(tr(paragraph, lang))
        # Link the advisor's name in its original sentence, without changing the author's text.
        advisor_name = 'Prof. Jiawei Wang' if lang == 'en' else '王家伟教授'
        advisor_name = esc(advisor_name)
        if advisor_name in escaped:
            link = f'<a class="advisor-inline-link" href="{esc(data["links"]["advisor"])}" target="_blank" rel="noopener noreferrer">{advisor_name}</a>'
            escaped = escaped.replace(advisor_name, link, 1)
        escaped = re.sub(r'\*\*(.*?)\*\*', r'<strong>\1</strong>', escaped)
        return '<p>' + escaped + '</p>'
    values["about_paragraphs"] = "".join(about_rich(paragraph) for paragraph in data["about"])
    values["scholar_icon"] = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" aria-hidden="true"><path d="m2 9 10-5 10 5-10 5L2 9Z"/><path d="M6 12v5c4 3 8 3 12 0v-5M21 10v6"/></svg>'
    values["linkedin_icon"] = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M5 8h3v11H5V8Zm1.5-5a1.8 1.8 0 1 1 0 3.6 1.8 1.8 0 0 1 0-3.6ZM10 8h3v1.4a3.6 3.6 0 0 1 3.1-1.6c3 0 3.9 2 3.9 5V19h-3v-5.5c0-1.7-.4-2.7-1.8-2.7-1.5 0-2.2 1.2-2.2 2.7V19h-3V8Z"/></svg>'
    values["github_icon"] = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.87C6.73 19.76 6.15 18 6.15 18c-.46-1.16-1.12-1.47-1.12-1.47-.92-.62.07-.61.07-.61 1.02.07 1.56 1.05 1.56 1.05.91 1.55 2.39 1.1 2.98.85.09-.66.36-1.1.65-1.36-2.21-.25-4.53-1.11-4.53-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.02A9.55 9.55 0 0 1 12 6.9c.85 0 1.7.12 2.5.34 1.91-1.29 2.75-1.02 2.75-1.02.55 1.38.2 2.4.1 2.65.64.7 1.03 1.59 1.03 2.68 0 3.84-2.32 4.68-4.54 4.93.37.33.7.98.7 1.98V21c0 .26.18.58.69.48A10 10 0 0 0 12 2Z"/></svg>'
    values["timeline_items"] = "".join(
        f'<li class="news-item"><span class="news-date mono">{esc(tr(p["timelineDate"],lang))}</span>'
        f'<a class="news-paper-title" href="#pub-{esc(p["id"])}">{esc(p["timelineTitle"])}'
        f'<span class="news-arrow" aria-hidden="true">↗</span></a>'
        f'<span class="news-venue">{esc(p["shortVenue"])}</span></li>'
        for p in data["publications"]
    )
    cards = []
    for r in data["research"]:
        tags = "".join(f'<span>{esc(t)}</span>' for t in r["tags"][lang])
        cards.append(f'<article class="research-card"><div class="research-card-top"><span class="mono">{esc(r["number"])}</span><span class="mono">{esc(r["label"])}</span></div>{diagram(r["id"])}<h3>{esc(tr(r["title"], lang)).replace(chr(10), "<br>")}</h3><p>{esc(tr(r["description"], lang))}</p><div class="research-tags">{tags}</div></article>')
    values["research_cards"] = "".join(cards)
    values["publication_rows"] = "".join(publication_html(p, lang, data) for p in data["publications"])
    values["education_items"] = "".join(f'<article class="timeline-item {"current" if e["current"] else ""}"><p class="timeline-date mono">{esc(tr(e["dates"], lang))}</p><h4>{esc(tr(e["institution"], lang))}</h4><p class="degree">{esc(tr(e["degree"], lang))}</p><p class="education-detail">{esc(tr(e["detail"], lang))}</p><p class="education-location">{esc(tr(e["location"], lang))}{(" · " + esc(tr(e["extra"], lang))) if tr(e["extra"], lang) else ""}</p></article>' for e in data["education"])
    values["experience_items"] = "".join(f'<article class="experience-item"><div class="experience-top"><h4>{esc(tr(e["role"], lang))}</h4><span class="mono">{esc(tr(e["dates"], lang))}</span></div><p class="experience-organization">{esc(tr(e["organization"], lang))}</p><p class="experience-detail">{esc(tr(e["detail"], lang))}</p><p class="experience-description">{esc(tr(e["description"], lang))}</p></article>' for e in data["experience"])
    values["ui_json"] = safe_json({"lang": lang, "messages": u})
    person = {"@context": "https://schema.org", "@type": "Person", "name": data["name"], "alternateName": data.get("nameZh", ""), "description": tr(data["description"], "en"), "email": "mailto:" + data["email"], "jobTitle": "Ph.D. Student in Intelligent Transportation", "affiliation": {"@type": "CollegeOrUniversity", "name": data["education"][0]["fullInstitution"]}, "alumniOf": [{"@type": "CollegeOrUniversity", "name": e["fullInstitution"]} for e in data["education"][1:]], "knowsAbout": ["Large language models for mobility", "Collaborative agents", "Interpretability", "Industrial engineering and operations research"], "sameAs": [data["links"][key] for key in ["scholar", "linkedin", "github"]]}
    if site_url:
        person["url"] = site_url + "/"
        values["seo_links"] = f'<link rel="canonical" href="{esc(site_url + "/" + name)}"><link rel="alternate" hreflang="en" href="{esc(site_url)}/index.html"><link rel="alternate" hreflang="zh-CN" href="{esc(site_url)}/zh.html"><meta property="og:url" content="{esc(site_url + "/" + name)}">'
    values["json_ld"] = safe_json(person)
    values.update({k: esc(v) for k, v in TEXT[lang].items()})
    values["scene_json"] = safe_json(scene_config(ROOT))
    values["avatar_html"] = avatar_html(data, lang, ROOT)
    values["visitors_html"] = visitors_html(ROOT, lang)
    values["visitors_json"] = safe_json(visitor_config(ROOT))
    return values

def cv_values(data: dict) -> dict[str, str]:
    values = {"email": esc(data["email"]), "updated": data["updated"]}
    for key in ["scholar", "github", "linkedin"]:
        values[key + "_url"] = esc(data["links"][key])
    values["cv_education"] = "".join(f'<article class="cv-entry"><div><h3>{esc(e["fullInstitution"])}</h3><span>{esc(tr(e["dates"], "en"))}</span></div><p>{esc(tr(e["degree"], "en"))} · {esc(tr(e["detail"], "en"))}</p><p>{esc(tr(e["location"], "en"))}{(" · " + esc(tr(e["extra"], "en"))) if tr(e["extra"], "en") else ""}</p></article>' for e in data["education"])
    values["cv_experience"] = "".join(f'<article class="cv-entry"><div><h3>{esc(tr(e["role"], "en"))}, {esc(tr(e["organization"], "en"))}</h3><span>{esc(tr(e["dates"], "en"))}</span></div><p>{esc(tr(e["detail"], "en"))} · {esc(e["location"])}</p><p>{esc(tr(e["description"], "en"))}</p></article>' for e in data["experience"])
    pubs = []
    for p in data["publications"]:
        venue = esc(p["venue"])
        if p.get("volume"):
            venue += ", vol. " + esc(p["volume"]) + ", article " + esc(p["article"])
        doi = f' DOI: <a href="https://doi.org/{esc(p["doi"])}">{esc(p["doi"])}</a>.' if p.get("doi") else ""
        pubs.append(f'<li>{author_html(p, data["name"])}. “{esc(p["title"])}.” <em>{venue}</em>, {p["year"]}. {esc(tr(p["note"], "en"))}.{doi}</li>')
    values["cv_publications"] = "".join(pubs)
    return values

def build(site_url: str | None = None) -> Path:
    data = json.loads((ROOT / "data/profile.json").read_text(encoding="utf-8"))
    validate(data)
    url = (data.get("siteUrl", "") if site_url is None else site_url).rstrip("/")
    if url:
        validate_url(url, "siteUrl")
    DIST.mkdir(exist_ok=True)
    if (DIST / "assets").exists():
        shutil.rmtree(DIST / "assets")
    shutil.copytree(ROOT / "public", DIST, dirs_exist_ok=True)
    template = (ROOT / "templates/index.html").read_text(encoding="utf-8")
    for lang, name in [("en", "index.html"), ("zh", "zh.html")]:
        (DIST / name).write_text(render(template, page_values(data, lang, url)), encoding="utf-8")
    cv = (ROOT / "templates/cv.html").read_text(encoding="utf-8")
    (DIST / "cv.html").write_text(render(cv, cv_values(data)), encoding="utf-8")
    (DIST / "publications.bib").write_text("% Metadata maintained in data/profile.json\n% Accepted entries should be updated after publication.\n\n" + "\n\n".join(bibtex(p) for p in data["publications"]) + "\n", encoding="utf-8")
    (DIST / ".nojekyll").write_text("", encoding="utf-8")
    if url:
        sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + "".join(f'<url><loc>{esc(url)}/{name}</loc><lastmod>{data["updated"]}</lastmod></url>' for name in ["index.html", "zh.html"]) + '</urlset>\n'
        (DIST / "sitemap.xml").write_text(sitemap, encoding="utf-8")
        (DIST / "robots.txt").write_text(f"User-agent: *\nAllow: /\nSitemap: {url}/sitemap.xml\n", encoding="utf-8")
    else:
        (DIST / "sitemap.xml").unlink(missing_ok=True)
        (DIST / "robots.txt").write_text("User-agent: *\nAllow: /\n", encoding="utf-8")
    return DIST

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--site-url", default=None, help="Public HTTPS site URL, e.g. https://name.github.io/repo; no trailing slash needed")
    args = parser.parse_args()
    try:
        result = build(args.site_url)
    except (OSError, ValueError, KeyError, TypeError) as error:
        parser.exit(1, f"Build failed: {error}\n")
    print(f"Built website: {result}")
