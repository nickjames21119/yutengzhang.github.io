#!/usr/bin/env python3
"""Install an already-prepared cartoon portrait. Does not generate a likeness or upload a photo."""
from __future__ import annotations
import argparse,json,shutil
from pathlib import Path
from build import ROOT,build

def main():
 parser=argparse.ArgumentParser(description=__doc__)
 parser.add_argument('image',type=Path,help='Local PNG/JPEG/WebP cartoon image (maximum 5 MiB)')
 args=parser.parse_args()
 try:
  path=args.image.expanduser().resolve()
  if not path.is_file():raise ValueError('Image file does not exist')
  if path.stat().st_size>5*1024*1024:raise ValueError('Use a web-sized image smaller than 5 MiB')
  data=path.read_bytes()
  if data.startswith(b'\x89PNG\r\n\x1a\n'):ext='.png'
  elif data.startswith(b'\xff\xd8\xff'):ext='.jpg'
  elif data.startswith(b'RIFF') and data[8:12]==b'WEBP':ext='.webp'
  else:raise ValueError('Image must have a PNG, JPEG, or WebP file signature')
  folder=ROOT/'public/assets/portrait';folder.mkdir(parents=True,exist_ok=True)
  dest=folder/('cartoon'+ext)
  if path!=dest.resolve():shutil.copyfile(path,dest)
  profile=json.loads((ROOT/'data/profile.json').read_text(encoding='utf-8'))
  profile.setdefault('avatar',{})['src']='assets/portrait/'+dest.name
  (ROOT/'data/profile.json').write_text(json.dumps(profile,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
  build();print('Portrait installed:',dest,'\nRefresh the local website.')
 except (OSError,ValueError) as error:parser.exit(1,str(error)+'\n')
if __name__=='__main__':main()
