"""v8 specific regression suite. Changes are editorial: 3D scene stays untouched."""
import json, unittest, hashlib, re
from pathlib import Path
from html.parser import HTMLParser

ROOT=Path(__file__).resolve().parents[1]
A=ROOT/'public/assets'
DATA=json.loads((ROOT/'data/profile.json').read_text(encoding='utf-8'))
EN=(ROOT/'dist/index.html').read_text(encoding='utf-8')
ZH=(ROOT/'dist/zh.html').read_text(encoding='utf-8')
CSS=(A/'v8.css').read_text(encoding='utf-8')
STARS=(A/'stars/Starfield.js').read_text(encoding='utf-8')

class V8Checks(unittest.TestCase):
    def test_star_centers_are_crisp_points(self):
        self.assertIn('const count=26;',STARS)
        self.assertIn("className='star-core'",STARS)
        self.assertIn("' star-glint'",STARS)
        self.assertIn('v8-star-twinkle',CSS)
        self.assertIn('v8-star-drift',CSS)
        self.assertNotIn('filter:blur(',CSS)
    def test_night_only_and_reduced_motion(self):
        self.assertIn("html[data-theme='light'] .site-night-sky {display:none!important}",CSS)
        self.assertIn('prefers-reduced-motion:reduce',CSS)
        self.assertIn("html[data-motion='paused'] .site-night-sky .star-core",CSS)
        self.assertIn('pointer-events:none',(A/'v6.css').read_text())
    def test_publication_heading_english(self):
        self.assertIn('id="publications-heading">Publication</h2>',EN)
        self.assertNotIn('Publications &amp; accepted work',EN)
    def test_no_publication_filters_or_search(self):
        for h in (EN,ZH):
            self.assertNotIn('class="filter-buttons"',h)
            self.assertNotIn('data-filter=',h)
            self.assertNotIn('id="publication-search"',h)
            self.assertEqual(h.count('class="publication"'),5)
    def test_thinklab_external_link_absent(self):
        for h in (EN,ZH):
            self.assertNotIn('href="https://sites.uw.edu/thinklab/"',h)
        self.assertNotIn('thinklab',DATA['links'])
    def test_advisor_link_embedded_exactly_one(self):
        for h,label in ((EN,'Prof. Jiawei Wang'),(ZH,'王家伟教授')):
            about=h.split('<div class="about-content">',1)[1].split('</div>',1)[0]
            self.assertEqual(about.count('<p>'),2)
            self.assertIn(f'>{label}</a>',about)
            self.assertEqual(about.count('class="advisor-inline-link"'),1)
            self.assertIn(DATA['links']['advisor'],about)
        self.assertIn('text-decoration: underline',CSS)
    def test_benchmark_copy(self):
        self.assertEqual(DATA['publications'][0]['summary']['en'],'A benchmark.')
        first=EN.split('id="pub-freight"',1)[1].split('</article>',1)[0]
        self.assertIn('class="paper-summary">A benchmark.</p>',first)
    def test_role_beside_logo_in_both_languages(self):
        self.assertIn('<span class="brand-subline">Ph.D. student · HKUST (Guangzhou)</span>',EN)
        self.assertIn('<span class="brand-subline">智能交通博士生 · 香港科技大学（广州）</span>',ZH)
        for h in (EN,ZH):
            self.assertNotIn('HKUST(GZ) / RESEARCH',h)
            self.assertNotIn('class="status-dot"',h)
    def test_v7_scene_remains_exact(self):
        expected=json.loads((ROOT/'tests/reference_city_v5_1_sha256.json').read_text())
        for path, sha in expected.items():
            self.assertEqual(hashlib.sha256((ROOT/path).read_bytes()).hexdigest(),sha,path)
    def test_visitor_backend_remains_present(self):
        self.assertTrue((ROOT/'backend/worker.js').is_file())
        self.assertIn('data-map-markers',EN)
        self.assertIn('assets/visitors/boot.js',EN)

if __name__=='__main__':unittest.main()
