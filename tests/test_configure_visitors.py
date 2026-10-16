from pathlib import Path
import sys,unittest,tempfile,json,shutil
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'scripts'))
from configure_visitors import configure,https_value
class ConfigureVisitorTests(unittest.TestCase):
 def setUp(self):
  self.temp=tempfile.TemporaryDirectory();self.root=Path(self.temp.name);(self.root/'data').mkdir()
  for path in ['wrangler.jsonc','data/visitors.json']:shutil.copy(ROOT/path,self.root/path)
 def tearDown(self):self.temp.cleanup()
 def test_database_identifier(self):
  configure(self.root,database_id='9b2b9024-94c9-49a9-a998-c01b86037c31')
  self.assertEqual(json.loads((self.root/'wrangler.jsonc').read_text())['d1_databases'][0]['database_id'],'9b2b9024-94c9-49a9-a998-c01b86037c31')
 def test_cross_origin(self):
  configure(self.root,api_base='https://api.example.org/api/',allow_origins=['https://name.github.io/','https://name.github.io'])
  self.assertEqual(json.loads((self.root/'data/visitors.json').read_text())['apiBase'],'https://api.example.org/api')
  self.assertEqual(json.loads((self.root/'wrangler.jsonc').read_text())['vars']['ALLOWED_ORIGINS'],'https://name.github.io')
 def test_invalid_urls(self):
  for u in ['https://u:p@site.org','http://site.org','javascript:alert(1)','//evil.org','https://site.org#secret','https://site.org:broken']:
   with self.assertRaises(ValueError):https_value(u)
  with self.assertRaises(ValueError):https_value('https://name.github.io/repository',origin=True)
 def test_invalid_inputs_leave_files_untouched(self):
  a=(self.root/'wrangler.jsonc').read_bytes();b=(self.root/'data/visitors.json').read_bytes()
  with self.assertRaises(ValueError):configure(self.root,database_id='9b2b9024-94c9-49a9-a998-c01b86037c31',worker_name='bad name')
  self.assertEqual(a,(self.root/'wrangler.jsonc').read_bytes());self.assertEqual(b,(self.root/'data/visitors.json').read_bytes())
 def test_no_fake_database(self):
  for d in ['not-a-uuid','00000000-0000-0000-0000-000000000000']:
   with self.assertRaises(ValueError):configure(self.root,database_id=d)
 def test_same_origin_reset(self):
  configure(self.root,api_base='./api',allow_origins=[],worker_name='my-academic-site')
  c=json.loads((self.root/'wrangler.jsonc').read_text());self.assertEqual(c['name'],'my-academic-site');self.assertEqual(c['vars']['ALLOWED_ORIGINS'],'')
