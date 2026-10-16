import copy,json,sys,tempfile,unittest,threading,functools
from pathlib import Path
from urllib.request import urlopen
from urllib.parse import quote
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
from experience import avatar_html,scene_config
from serve import PreviewHandler
from http.server import ThreadingHTTPServer

class ExperienceTests(unittest.TestCase):
 def test_config_valid(self):
  c=scene_config(ROOT);self.assertTrue(1<=len(c['agents'])<=12)
 def test_avatar_placeholder_is_not_an_invented_person(self):
  d={'avatar':{'src':''}}
  self.assertEqual(d['avatar']['src'],'');self.assertIn('YZ',avatar_html(d,'en',ROOT));self.assertNotIn('<img',avatar_html(d,'en',ROOT))
 def test_avatar_path_traversal_rejected(self):
  for src in ['/etc/passwd','../private.jpg','assets/portrait/../../../private.jpg','https://example.org/p.png']:
   with self.assertRaises(ValueError):avatar_html({'avatar':{'src':src}},'en',ROOT)
 def test_avatar_missing_file_rejected(self):
  with self.assertRaises(ValueError):avatar_html({'avatar':{'src':'assets/portrait/not-there.png'}},'en',ROOT)
 def test_config_rejects_invalid_positions_and_colors(self):
  orig=json.loads((ROOT/'data/scene.json').read_text())
  for modification in ['nan','color','duplicate','fractional']:
   c=copy.deepcopy(orig)
   if modification=='nan':c['agents'][0]['position'][0]=float('nan')
   if modification=='color':c['palette']['cyan'][0]='javascript:bad'
   if modification=='duplicate':c['agents'][1]['id']=c['agents'][0]['id']
   if modification=='fractional':c['city']['grid']=4.5
   with tempfile.TemporaryDirectory() as d:
    root=Path(d);(root/'data').mkdir();(root/'data/scene.json').write_text(json.dumps(c))
    with self.assertRaises(ValueError):scene_config(root)
 def test_esm_imports_are_local_and_exist(self):
  import re
  for path in (ROOT/'public/assets/scene').rglob('*.js'):
   for relative in re.findall(r"(?:from\s+|import\()['\"]([^'\"]+)['\"]",path.read_text()):
    self.assertTrue(relative.startswith('.'),(path,relative));self.assertTrue((path.parent/relative).resolve().is_file(),(path,relative))
 def test_selected_avatar_bytes_preserved(self):
  import hashlib
  self.assertEqual(hashlib.sha256((ROOT/'public/assets/portrait/avatar.jpg').read_bytes()).hexdigest(),'37c70b5db8cb969e978e876a8c2907039fde0e9e649a60819c6ee3fb20db3d41')
 def test_ground_and_motion_config_rejects_invalid_values(self):
  orig=json.loads((ROOT/'data/scene.json').read_text())
  for key in ['negative_motion','oversized_grid','fractional_particles','bad_target']:
   c=copy.deepcopy(orig)
   if key=='negative_motion':c['motion']['autoRotateSpeed']=-1
   if key=='oversized_grid':c['city']['grid']=9
   if key=='fractional_particles':c['motion']['ambientParticles']=3.5
   if key=='bad_target':c['camera']['target']=[0,0]
   with tempfile.TemporaryDirectory() as d:
    root=Path(d);(root/'data').mkdir();(root/'data/scene.json').write_text(json.dumps(c))
    with self.assertRaises(ValueError):scene_config(root)
 def test_no_obsolete_panel_or_bottom_caption(self):
  text=(ROOT/'dist/index.html').read_text()
  self.assertNotIn('class="scene-caption"',text)
  self.assertNotIn('class="scene-help"',text)
  self.assertNotIn('class="visual-topline"',text)
  self.assertIn('class="sr-only" id="scene-help"',text)
 def test_page_motion_imports_are_local(self):
  import re
  for path in (ROOT/'public/assets/motion').rglob('*.js'):
   for relative in re.findall(r"(?:from\s+|import\()['\"]([^'\"]+)['\"]",path.read_text()):
    self.assertTrue(relative.startswith('.'));self.assertTrue((path.parent/relative).resolve().is_file())
 def test_static_http_assets_status_and_javascript_mime(self):
  # Independent HTTP transport test. Does not claim browser navigation was tested.
  class Quiet(PreviewHandler):
   def log_message(self,*args):pass
  server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT/'dist')))
  thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
  try:
   for path in (ROOT/'dist').rglob('*'):
    if not path.is_file():continue
    with urlopen(f'http://127.0.0.1:{server.server_port}/'+quote(path.relative_to(ROOT/'dist').as_posix())) as response:
     self.assertEqual(response.status,200);self.assertEqual(len(response.read()),path.stat().st_size)
     if path.suffix=='.js':self.assertIn('javascript',response.headers['Content-Type'])
  finally:server.shutdown();server.server_close();thread.join()

if __name__=='__main__':unittest.main()
