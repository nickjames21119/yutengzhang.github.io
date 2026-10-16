"""Standard-library tests. These run without Playwright or internet access."""
from __future__ import annotations
import copy
import importlib.util
import json
import re
import tempfile
import unittest
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlparse

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('site_build', ROOT / 'scripts/build.py')
builder = importlib.util.module_from_spec(spec)
spec.loader.exec_module(builder)

class Scan(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids = []
        self.refs = []
        self.external = []
        self.images = []
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if a.get('id'): self.ids.append(a['id'])
        for key in ['href', 'src']:
            if a.get(key): self.refs.append(a[key])
        if tag == 'a' and a.get('target') == '_blank': self.external.append(a)
        if tag == 'img': self.images.append(a)

class SiteTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.data = json.loads((ROOT / 'data/profile.json').read_text(encoding='utf-8'))
        cls.tmp = tempfile.TemporaryDirectory()
        cls.original_dist = builder.DIST
        builder.DIST = Path(cls.tmp.name)
        builder.build('https://example.org/research')
        cls.dist = builder.DIST
    @classmethod
    def tearDownClass(cls):
        builder.DIST = cls.original_dist
        cls.tmp.cleanup()
    def test_profile_valid(self):
        builder.validate(self.data)
    def test_generated_pages_and_assets(self):
        for file in ['index.html','zh.html','cv.html','publications.bib','.nojekyll','assets/styles.css','assets/app.js','assets/scene/boot.js','assets/scene/SceneController.js','assets/experience.css','assets/favicon.svg','sitemap.xml','robots.txt']:
            self.assertTrue((self.dist/file).is_file(), file)
    def test_no_template_markers(self):
        for file in ['index.html','zh.html','cv.html']:
            self.assertIsNone(re.search(r'\{\{[a-zA-Z_]+\}\}',(self.dist/file).read_text(encoding='utf-8')))
    def test_ids_unique_and_internal_links_resolve(self):
        for file in ['index.html','zh.html','cv.html']:
            parser=Scan();parser.feed((self.dist/file).read_text(encoding='utf-8'))
            self.assertEqual(len(parser.ids),len(set(parser.ids)), file)
            for ref in parser.refs:
                if ref.startswith('#'):
                    self.assertIn(ref[1:],parser.ids,ref)
                elif not urlparse(ref).scheme:
                    self.assertTrue((self.dist/unquote(ref.split('#')[0])).exists(),ref)
    def test_external_tab_safety(self):
        for file in ['index.html','zh.html']:
            parser=Scan();parser.feed((self.dist/file).read_text(encoding='utf-8'))
            for anchor in parser.external:
                self.assertIn('noopener',anchor.get('rel',''),anchor)
    def test_no_external_asset_dependencies_in_default_build(self):
        for file in ['index.html','zh.html']:
            source=(self.dist/file).read_text(encoding='utf-8')
            parser=Scan();parser.feed(source)
            self.assertEqual(len(parser.images),1 if self.data.get('avatar',{}).get('src') else 0)
            self.assertNotRegex(source,r'<script[^>]+src="https?://')
            self.assertNotRegex(source,r'<link[^>]+stylesheet[^>]+href="https?://')
        css=(self.dist/'assets/styles.css').read_text(encoding='utf-8')
        self.assertNotIn('@import',css)
    def test_all_configured_publications_rendered(self):
        for lang in ['index.html','zh.html']:
            source=(self.dist/lang).read_text(encoding='utf-8')
            self.assertEqual(source.count('class="publication"'),len(self.data['publications']))
            for paper in self.data['publications']:
                self.assertIn('id="pub-'+paper['id']+'"',source)
    def test_first_author_flags(self):
        self.assertGreaterEqual(sum(p['firstAuthor'] for p in self.data['publications']),0)
        for paper in self.data['publications']:
            self.assertEqual(paper['firstAuthor'],paper['authors'][0]==self.data['name'])
    def test_heatwave_updated_without_duplicate_entry(self):
        paper=next(p for p in self.data['publications'] if p['id']=='heat')
        self.assertEqual(paper['doi'],'10.1016/j.trd.2026.105363')
        self.assertEqual(paper['status'],'published')
        self.assertEqual(paper['volume'],'156')
        self.assertEqual(paper['article'],'105363')
        self.assertEqual(len([p for p in self.data['publications'] if 'Adapting travel behavior' in p['title']]),1)
    def test_bibtex_count_and_no_invented_freight_doi(self):
        content=(self.dist/'publications.bib').read_text(encoding='utf-8')
        self.assertEqual(len(re.findall(r'^@',content,re.M)),len(self.data['publications']))
        freight=builder.bibtex(self.data['publications'][0])
        self.assertNotIn('doi =',freight)
        self.assertIn('Accepted for publication',freight)
    def test_safe_script_json(self):
        self.assertNotIn('</script>',builder.safe_json({'x':'</script><script>alert(1)</script>'}))
    def test_bad_url_rejected(self):
        data=copy.deepcopy(self.data);data['links']['scholar']='javascript:alert(1)'
        with self.assertRaises(ValueError): builder.validate(data)
    def test_duplicate_id_rejected(self):
        data=copy.deepcopy(self.data);data['publications'][1]['id']='freight'
        with self.assertRaises(ValueError): builder.validate(data)
    def test_new_paper_id_uses_generic_art(self):
        self.assertIn('<svg',builder.diagram('a-future-paper'))
    def test_seo_uses_real_configured_url(self):
        for file in ['index.html','zh.html']:
            source=(self.dist/file).read_text(encoding='utf-8')
            self.assertIn('https://example.org/research/'+file,source)
            self.assertIn('application/ld+json',source)
    def test_schema_is_student_not_faculty(self):
        source=(self.dist/'index.html').read_text(encoding='utf-8')
        match=re.search(r'<script type="application/ld\+json">(.*?)</script>',source,re.S)
        person=json.loads(match.group(1))
        self.assertEqual(person['jobTitle'],'Ph.D. Student in Intelligent Transportation')
        self.assertNotIn('Professor',person['jobTitle'])
    def test_current_cv_details(self):
        self.assertEqual(self.data['education'][2]['detail']['en'],'GPA: 3.67 / 4.00')
        self.assertEqual(self.data['education'][0]['start'],'2026-09-01')
        self.assertEqual(self.data['education'][0]['expectedEnd'],'2029-06-01')
    def test_minimal_publish_folder(self):
        self.assertFalse((self.dist/'data').exists())
        self.assertFalse((self.dist/'tests').exists())
        self.assertFalse((self.dist/'CONTENT_SOURCES.md').exists())

if __name__ == '__main__': unittest.main()
