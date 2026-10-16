#!/usr/bin/env python3
"""Optional CPU/offline interactive preview capture, using the real site modules.
Requires Playwright, Chromium and Pillow. This is not a frame-rate benchmark.
"""
from pathlib import Path
import argparse,io,shutil
from PIL import Image
from playwright.sync_api import sync_playwright
from browser_smoke import load_offline

def main():
 p=argparse.ArgumentParser();p.add_argument('--output',type=Path,required=True);a=p.parse_args();frames=[]
 with sync_playwright() as tool:
  browser=tool.chromium.launch(executable_path=shutil.which('chromium'),args=['--no-sandbox'],headless=True)
  page=browser.new_page(viewport={'width':1440,'height':900},device_scale_factor=1)
  load_offline(page);page.mouse.move(2,2);page.wait_for_timeout(900)
  page.add_style_tag(content='.cursor-halo {display:none!important}')
  def frame():
   im=Image.open(io.BytesIO(page.screenshot())).convert('RGB').crop((0,0,1440,675)).resize((960,450),Image.Resampling.LANCZOS)
   frames.append(im)
  for _ in range(4):page.wait_for_timeout(130);frame()
  c=page.locator('#city-canvas');b=c.bounding_box();x=b['x']+b['width']*.52;y=b['y']+b['height']*.5
  page.mouse.move(x,y)
  for _ in range(9):page.wait_for_timeout(90);frame()
  page.mouse.down()
  for i in range(9):page.mouse.move(x+10*i,y-6*i);page.wait_for_timeout(70);frame()
  page.mouse.up();page.mouse.move(2,2)
  for _ in range(9):page.wait_for_timeout(90);frame()
  c.focus();c.press('Home');page.mouse.move(x,y);page.mouse.down()
  for i in range(8):page.mouse.move(x-9*i,y+4*i);page.wait_for_timeout(70);frame()
  page.mouse.up();page.mouse.move(2,2)
  for _ in range(4):page.wait_for_timeout(120);frame()
  browser.close()
 a.output.parent.mkdir(parents=True,exist_ok=True)
 frames[0].save(a.output,save_all=True,append_images=frames[1:],loop=0,duration=150,optimize=True,disposal=2)
 print(str(a.output),len(frames),'frames')
if __name__=='__main__':main()
