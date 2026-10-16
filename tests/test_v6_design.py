"""v6 regression: protect the owner's exact v5.1 city scene, layout, brand and map."""
import unittest, json,hashlib,re,xml.etree.ElementTree as ET
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
PROFILE=json.loads((ROOT/'data/profile.json').read_text())

class V6Tests(unittest.TestCase):
 def setUp(self):
  self.en=(ROOT/'dist/index.html').read_text()
  self.zh=(ROOT/'dist/zh.html').read_text()
  self.css=(ROOT/'public/assets/v6.css').read_text()

 def test_unchanged_city_javascript(self):
  expected=json.loads((ROOT/'tests/reference_city_v5_1_sha256.json').read_text())
  self.assertEqual(len(expected),13)
  for path,digest in expected.items():
   with self.subTest(path=path):
    self.assertEqual(hashlib.sha256((ROOT/path).read_bytes()).hexdigest(),digest)

 def test_unchanged_city_parameters(self):
  # Scene profile was copied byte-for-byte from v5.1; no generated test scenes.
  self.assertIn('data-city-scene',self.en)
  self.assertIn('assets/scene/boot.js',self.en)

 def test_news_detached_from_hero_city(self):
  x=self.en.index('class="hero-visual city-experience"')
  y=self.en.index('</section>',x)
  z=self.en.index('class="news-dock container"')
  self.assertGreater(z,y)
  self.assertIn('id="news"',self.en)
  self.assertNotIn('hero-timeline',self.en)

 def test_five_news_links_internal_and_complete(self):
  seg=self.en.split('<section class="news-dock container"',1)[1].split('</section>',1)[0]
  self.assertEqual(re.findall(r'href="#pub-([a-z0-9-]+)"',seg),['freight','causal','heat','lbs','gan'])

 def test_uncluttered_hero(self):
  self.assertNotIn('hero-footline',self.en)
  self.assertEqual(self.en.count('class="hero-social-link"'),3)
  self.assertNotIn('href="cv.html"',self.en)

 def test_brand_svg_is_single_authoritative_master(self):
  content=(ROOT/'public/assets/brand-yz.svg').read_text()
  ET.fromstring(content)
  self.assertIn('M9 12L23.3 27.9 37.7 12H56',content)
  self.assertIn('viewBox="0 0 64 64"',content)
  self.assertIn('class="brand-mark"',self.en)
  self.assertEqual((ROOT/'branding/YZ-primary-gold.svg').read_text(),content)
  for f in ['YZ-black.svg','YZ-white.svg','YZ-favicon.svg']:
   ET.parse(ROOT/'branding'/f)

 def test_theme_specific_sky(self):
  sky=(ROOT/'public/assets/stars/Starfield.js').read_text()
  self.assertIn('count=26',sky)
  self.assertIn('pointer-events:none',self.css)
  self.assertIn("html[data-theme='light'] .site-night-sky{display:none}",self.css)
  self.assertIn("html[data-motion='paused']",self.css)

 def test_star_js_is_independent(self):
  import pathlib
  sky=(ROOT/'public/assets/stars/Starfield.js').read_text()
  self.assertNotIn('fetch(',sky)
  self.assertNotIn('scene/',sky)
  self.assertIn('assets/stars/boot.js',self.en)

 def test_news_and_external_links_exist_in_both_languages(self):
  for page in [self.en,self.zh]:
   self.assertIn('id="news-heading"',page)
   self.assertIn('class="news-paper-title"',page)
   for tag in ['Google Scholar','LinkedIn','GitHub']:
    self.assertIn(tag,page)

 def test_responsive_news(self):
  self.assertIn('@media(max-width:740px)',self.css)
  self.assertIn('grid-column:1/-1;grid-row:2',self.css)
  self.assertIn('.news-date{grid-column:1;grid-row:1',self.css)

 def test_about_two_paragraphs(self):
  self.assertEqual(len(PROFILE['about']),2)
  self.assertIn('how LLMs understand and reason about human mobility and urban environments',PROFILE['about'][1]['en'])
  seg=self.en.split('<div class="about-content">',1)[1].split('</div>',1)[0]
  self.assertEqual(seg.count('<p>'),2)

 def test_visitor_backend_is_present(self):
  self.assertTrue((ROOT/'backend/worker.js').exists())
  self.assertTrue((ROOT/'backend/migrations/0001_visitors.sql').exists())
  self.assertIn('data-map-markers',self.en)
  self.assertIn('assets/visitors/boot.js',self.en)
  self.assertIn('apiBase',json.loads((ROOT/'data/visitors.json').read_text()))

 def test_accepted_papers_no_dead_links(self):
  for paper in ('freight','causal'):
   card=self.en.split('id="pub-'+paper+'"',1)[1].split('</article>',1)[0]
   self.assertNotIn('<a class="paper-link',card)

 def test_no_placeholder_map_points(self):
  self.assertNotIn('class="marker-dot"',self.en)

if __name__=='__main__': unittest.main()
