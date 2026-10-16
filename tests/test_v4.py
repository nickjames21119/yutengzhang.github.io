from pathlib import Path
import json,copy,tempfile,unittest,sys,re
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'scripts'))
from visitors import visitor_config,land_paths
class V4Tests(unittest.TestCase):
 def test_no_city_ui_or_citation_markup(self):
  h=(ROOT/'dist/index.html').read_text()
  for term in ['data-scene-view=','data-scene-zoom=','data-scene-pause','class="agent-label','class="paper-art','data-cite=','id="citation-dialog"','Paper request:']:
   self.assertNotIn(term,h)
 def test_short_headings(self):
  h=(ROOT/'dist/index.html').read_text();self.assertIn('id="journey-heading">Path.</h2>',h);self.assertIn('Let’s connect.</h2>',h)
 def test_visitor_map_exists_without_fake_records(self):
  h=(ROOT/'dist/index.html').read_text();self.assertIn('data-map-markers></g>',h);self.assertIn('data-visit-total>—',h);self.assertNotIn('marker-dot',h)
 def test_naturalearth_land_present(self):
  p=land_paths(ROOT);self.assertTrue(p.startswith('<path'));self.assertGreater(len(p),20000)
 def test_valid_visitor_configuration(self):
  self.assertIsInstance(visitor_config(ROOT)['apiBase'],str)
 def test_bad_visitor_configuration_rejected(self):
  orig=visitor_config(ROOT)
  for change in [{'apiBase':'javascript:bad'},{'apiBase':'http://insecure.example/api'},{'apiBase':'//evil.example/api'},{'requestTimeoutMs':0},{'refreshSeconds':1},{'enabled':'yes'}]:
   with tempfile.TemporaryDirectory() as tmp:
    root=Path(tmp);(root/'data').mkdir();(root/'data/visitors.json').write_text(json.dumps({**orig,**change}))
    with self.assertRaises(ValueError):visitor_config(root)
 def test_no_backend_or_secret_in_publish_directory(self):
  for f in ['backend/worker.js','.dev.vars','wrangler.jsonc','data/visitors.json']:self.assertFalse((ROOT/'dist'/f).exists())
 def test_custom_cursor_assets(self):
  for f in ['pointer-dark.svg','pointer-light.svg','pointer-text.svg']:self.assertTrue((ROOT/'dist/assets/interaction'/f).exists())
 def test_all_frontend_module_imports_exist(self):
  for p in (ROOT/'public/assets').rglob('*.js'):
   for ref in re.findall(r"(?:from\s+|import\()['\"]([^'\"]+)['\"]",p.read_text()):
    self.assertTrue((p.parent/ref).resolve().is_file(),str(p)+': '+ref)
 def test_runtime_requires_no_external_font_or_map_tiles(self):
  for p in (ROOT/'public/assets').rglob('*.js'):
   t=p.read_text();self.assertNotIn('getCurrentPosition(',t);self.assertNotIn('ipapi.co',t);self.assertNotIn('tile.openstreetmap',t)
