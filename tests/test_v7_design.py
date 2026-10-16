"""v7 only: do not modify the established scene, content, or visitor backend."""
from pathlib import Path
import hashlib,json, unittest, re, xml.etree.ElementTree as ET
R=Path(__file__).resolve().parents[1]
A=R/'public/assets'
H=(R/'dist/index.html').read_text(encoding='utf-8')
ZH=(R/'dist/zh.html').read_text(encoding='utf-8')
CSS=(A/'v7.css').read_text(encoding='utf-8')

class V7Design(unittest.TestCase):
 def test_active_y_not_yz(self):
  self.assertIn('M15.2 15.0L32 32.1L48.8 15.0',H)
  self.assertNotIn('M9 12L23.3 27.9 37.7 12H56',H)
  self.assertIn('branding',str(R/'branding'))
 def test_proportional_logo(self):
  root=ET.parse(A/'brand-y.svg').getroot()
  self.assertEqual(root.attrib['viewBox'],'0 0 64 64')
  svg=(A/'brand-y.svg').read_text()
  self.assertEqual(svg.count('<circle'),4)
  self.assertAlmostEqual((48.8-15.2)/(50.6-15.0),0.944,places=2)
  self.assertIn('stroke-width="3.35"',svg)
 def test_logo_variants_valid(self):
  for x in ['Y-primary-gold.svg','Y-black.svg','Y-white.svg','Y-favicon.svg']:
   ET.parse(R/'branding'/x)
  ET.parse(A/'favicon.svg')
  self.assertEqual((A/'favicon.svg').read_bytes(),(R/'branding/Y-favicon.svg').read_bytes())
 def test_responsive_brand_respects_v6(self):
  self.assertRegex(CSS,r'width:\s*40px;\s*height:\s*40px')
  self.assertIn('max-width:740px',CSS)
 def test_star_count_kept_sparse(self):
  self.assertIn('count=26',(A/'stars/Starfield.js').read_text())
  self.assertIn('v7-star-twinkle',CSS)
  self.assertIn('--twinkle-peak:',CSS)
  self.assertIn('pointer-events:none',(A/'v6.css').read_text())
 def test_star_absent_from_light(self):
  self.assertIn("html[data-theme='light'] .site-night-sky{display:none}",CSS)
  self.assertIn('prefers-reduced-motion:reduce',CSS)
 def test_click_module_is_independent(self):
  src=(A/'interaction/ClickPulse.js').read_text()
  self.assertIn('pointerdown',src)
  self.assertIn('pointerup',src)
  self.assertIn('Math.hypot',src)
  self.assertIn('e.button !== 0',src)
  self.assertIn("e.pointerType === 'touch'",src)
  self.assertNotIn('scene/',src)
 def test_click_does_not_break_user_motion_pref(self):
  src=(A/'interaction/ClickPulse.js').read_text()
  self.assertIn("prefers-reduced-motion: reduce",src)
  self.assertIn("dataset.motion !== 'running'",src)
  self.assertIn('pointer-events:none',CSS)
 def test_click_animation_life_cycle(self):
  src=(A/'interaction/ClickPulse.js').read_text()
  self.assertIn('setTimeout(() => item.remove(), 1000)',src)
  self.assertIn('this.abort.abort()',src)
  self.assertIn('@keyframes v7-click-dot',CSS)
  self.assertIn('@keyframes v7-click-wave',CSS)
 def test_modules_shipped(self):
  for d in [A,R/'dist/assets']:
   self.assertTrue((d/'interaction/ClickPulse.js').is_file())
   self.assertTrue((d/'interaction/click-boot.js').is_file())
   self.assertTrue((d/'v7.css').is_file())
   self.assertTrue((d/'brand-y.svg').is_file())
 def test_english_chinese_both_include_additions(self):
  for h in (H,ZH):
   self.assertIn('assets/v7.css',h)
   self.assertIn('assets/interaction/click-boot.js',h)
   self.assertIn('aria-hidden="true" focusable="false"',h)
   self.assertNotIn('href="cv.html"',h)
 def test_no_city_frame(self):
  self.assertIn('border:0!important;outline:0!important;border-radius:0!important;',CSS)
  self.assertIn('canvas:focus-visible',CSS)
  self.assertIn('.hero-visual.city-experience::before,.hero-visual.city-experience::after{content:none!important}',CSS)
 def test_source_city_untouched(self):
  expected=json.loads((R/'tests/reference_city_v5_1_sha256.json').read_text())
  self.assertEqual(len(expected),13)
  for path,sha in expected.items():
   with self.subTest(path=path):
    self.assertEqual(hashlib.sha256((R/path).read_bytes()).hexdigest(),sha)
 def test_core_content_map_still_preserved(self):
  self.assertEqual(len(json.loads((R/'data/profile.json').read_text())['about']),2)
  self.assertIn('id="news-heading"',H)
  self.assertIn('data-map-markers></g>',H)
  self.assertTrue((R/'backend/worker.js').is_file())
 def test_v7_docs_and_deploy(self):
  self.assertTrue((R/'START_HERE_V7_CN.md').is_file())
  self.assertTrue((R/'branding/README_Y_V7_CN.md').is_file())
  self.assertTrue((R/'dist/.nojekyll').is_file())
  self.assertTrue((R/'.github/workflows/pages.yml').is_file())

if __name__=='__main__':unittest.main()
