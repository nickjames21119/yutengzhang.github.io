"""Specific regression checks for the owner's final v5.1 content and layout changes."""
import json,re,unittest
from pathlib import Path
from html import unescape

ROOT=Path(__file__).resolve().parents[1]
P=json.loads((ROOT/'data/profile.json').read_text(encoding='utf-8'))
H=(ROOT/'dist/index.html').read_text(encoding='utf-8')
ZH=(ROOT/'dist/zh.html').read_text(encoding='utf-8')

class HomepageV51Tests(unittest.TestCase):
 def test_two_exact_english_paragraphs(self):
  self.assertEqual(len(P['about']),2)
  self.assertEqual(P['about'][0]['en'],'I am a Ph.D. student in Intelligent Transportation at the Hong Kong University of Science and Technology (Guangzhou), advised by Prof. Jiawei Wang. I received my M.S. in Industrial and Systems Engineering from the University of Washington and my B.E. in Software Engineering from Jilin University.')
  self.assertEqual(P['about'][1]['en'],'My research interests lie at the intersection of **Large Language Models (LLMs), spatiotemporal data, and intelligent decision-making**. I am particularly interested in how LLMs understand and reason about human mobility and urban environments, how their internal knowledge and decision-making processes can be interpreted, and how agent-based systems can support spatiotemporal analysis and decision-making.')
 def test_about_visible_as_exactly_two_paragraphs(self):
  segment=H.split('<div class="about-content">',1)[1].split('</div>',1)[0]
  self.assertEqual(segment.count('<p>'),2)
  self.assertIn('<strong>Large Language Models (LLMs), spatiotemporal data, and intelligent decision-making</strong>',segment)
 def test_bilingual_about(self):
  self.assertEqual(len([p['zh'] for p in P['about']]),2)
  self.assertIn('大语言模型（LLMs）',ZH)
 def test_no_cv_entry_point(self):
  for page in [H,ZH]:self.assertNotIn('href="cv.html"',page)
 def test_no_standalone_directions(self):
  for page in [H,ZH]:
   self.assertNotIn('id="research"',page)
   self.assertNotIn('href="#research"',page)
   self.assertNotIn('Four connected directions',page)
 def test_about_heading_changed(self):
  self.assertIn('id="about-heading">About.</h2>',H)
  self.assertIn('id="about-heading">关于我。</h2>',ZH)
 def test_hero_keywords(self):
  self.assertIn('LLMs for Spatiotemporal Data.',H)
  self.assertIn('LLM Interpretability.',H)
 def test_v7_logo_returns_to_y_with_nodes(self):
  svg=(ROOT/'public/assets/favicon.svg').read_text()
  self.assertIn('viewBox="0 0 64 64"',svg)
  self.assertIn('M15.2 15.0L32 32.1L48.8 15.0',svg)
  self.assertEqual(svg.count('<circle'),4)
  self.assertTrue((ROOT/'public/assets/brand-y.svg').is_file())
  self.assertIn('class="brand-mark"',H)
 def test_detached_five_publications_in_date_order(self):
  section=H.split('<section class="news-dock container"',1)[1].split('</section>',1)[0]
  ids=re.findall(r'href="#pub-([a-z0-9-]+)"',section)
  self.assertEqual(ids,['freight','causal','heat','lbs','gan'])
  self.assertIn('Jul 2026',section)
  self.assertIn('Jan 2026',section)
  self.assertIn('Feb 2024',section)
  self.assertNotIn('hero-timeline',section)
 def test_no_paper_link_for_accepted_work(self):
  for paper in ['freight','causal']:
   section=H.split('id="pub-'+paper+'"',1)[1].split('</article>',1)[0]
   self.assertNotRegex(section,r'class="paper-link(?:"| )')
  for paper in ['heat','lbs','gan']:
   section=H.split('id="pub-'+paper+'"',1)[1].split('</article>',1)[0]
   self.assertRegex(section,r'class="paper-link(?:"| )')
 def test_detached_dock_is_responsive(self):
  css=(ROOT/'public/assets/v6.css').read_text()
  self.assertIn('.news-panel{display:grid;',css)
  self.assertIn('max-width:960px',css)
  self.assertIn('max-width:740px',css)
 def test_visitor_map_is_not_padded_with_explanation(self):
  section=H.split('<section class="visitors-section',1)[1].split('</section>',1)[0]
  self.assertIn('data-map-markers></g>',section)
  self.assertNotIn('A view of where visitors connect from',section)
  self.assertNotIn('Map geometry',section)
  self.assertNotIn('About visitor records',section)
  self.assertNotIn('LAST 90 DAYS',section)
 def test_no_fake_visitors(self):
  self.assertNotIn('class="marker-dot"',H)
  self.assertIn("from './VisitorMap.js'",(ROOT/'public/assets/visitors/boot.js').read_text())
 def test_visitor_pulses_css(self):
  css=(ROOT/'public/assets/visitors/visitors.css').read_text()
  self.assertIn('@keyframes visitor-twinkle',css)
  self.assertIn('@keyframes marker-pulse',css)
 def test_external_api_remains_configurable(self):
  config=json.loads((ROOT/'data/visitors.json').read_text())
  self.assertTrue(config['enabled'])
  self.assertIn(config['apiBase'],['./api','/api'] if not config['apiBase'].startswith('https:') else [config['apiBase']])
  self.assertTrue((ROOT/'backend/worker.js').is_file())
  self.assertTrue((ROOT/'backend/migrations/0001_visitors.sql').is_file())

if __name__=='__main__':unittest.main()
