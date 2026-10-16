"""Validated scene configuration and optional portrait. No network or image processing."""
from __future__ import annotations
import json, math, re
from pathlib import Path
from html import escape

TEXT = {
  "en": {
    "scene_label": "Three-dimensional city and a holographic agent network",
    "scene_canvas_label": "Rotatable 3D city. Hover to reveal agents; drag in any direction. Arrow keys rotate, Q/E roll, Space reveals, Home resets.",
    "scene_fallback_title": "The city is still here.",
    "scene_help": "Hover to reveal · drag to rotate freely · tap on mobile",
    "scene_noscript": "Enable JavaScript to explore the interactive city. All research content remains available."
  },
  "zh": {
    "scene_label": "可旋转的三维城市与全息智能体网络",
    "scene_canvas_label": "可旋转的三维城市。悬停显露智能体，按住鼠标自由旋转。方向键旋转，Q/E 翻滚，空格显示智能体，Home 复位。",
    "scene_fallback_title": "城市仍在这里。",
    "scene_help": "悬停显露智能体 · 按住任意旋转 · 手机轻触切换",
    "scene_noscript": "启用 JavaScript 后可操作三维城市。论文与个人资料仍可正常阅读。"
  }
}

def scene_config(root: Path) -> dict:
 c=json.loads((root/'data/scene.json').read_text(encoding='utf-8'))
 def number(v,lo,hi,label):
  if isinstance(v,bool) or not isinstance(v,(int,float)) or not math.isfinite(v) or not lo<=v<=hi:
   raise ValueError(f'{label} must be a finite number in [{lo}, {hi}]')
 number(c['seed'],0,4294967295,'seed')
 for k,lo,hi in [('fov',20,80),('distance',22,80),('pitch',-6.3,6.3),('yaw',-6.3,6.3),('minZoom',.3,1),('maxZoom',1,2)]:number(c['camera'][k],lo,hi,'camera.'+k)
 for k,lo,hi in [('maxDpr',.5,2),('maxFps',10,60),('mobileFps',10,60),('softwareFps',8,30)]:number(c['performance'][k],lo,hi,'performance.'+k)
 number(c['transitionSpeed'],1,20,'transitionSpeed')
 for k,lo,hi in [('grid',3,9),('spacing',1.5,3),('trafficCount',0,200)]:number(c['city'][k],lo,hi,'city.'+k)
 for k,lo,hi in [('width',12,30),('depth',12,30),('buildingHeight',.3,9)]:number(c['city'][k],lo,hi,'city.'+k)
 if (c['city']['grid']-1)*c['city']['spacing']+1.5>min(c['city']['width'],c['city']['depth']):
  raise ValueError('City grid exceeds the ground; reduce grid/spacing or increase width/depth')
 for k,lo,hi in [('autoRotateSpeed',0,.5),('floatAmplitude',0,1),('floatSpeed',.1,3),('idleResumeDelay',0,60),('ambientParticles',0,80)]:number(c['motion'][k],lo,hi,'motion.'+k)
 if not isinstance(c['motion']['ambientParticles'],int):raise ValueError('ambientParticles must be an integer')
 if len(c['camera'].get('target',[]))!=3:raise ValueError('camera.target needs three coordinates')
 for v in c['camera']['target']:number(v,-20,20,'camera.target')
 for k in ['grid','trafficCount']:
  if not isinstance(c['city'][k],int):raise ValueError('city.'+k+' must be an integer')
 for k,pair in c['palette'].items():
  if not isinstance(pair,list) or len(pair)!=2 or any(not re.fullmatch('#[0-9a-fA-F]{6}',v) for v in pair):raise ValueError('Invalid night/day colors: '+k)
 if not 1<=len(c['agents'])<=12:raise ValueError('Use 1 to 12 agents')
 seen=set()
 for a in c['agents']+[c['core']]:
  if len(a['position'])!=3:raise ValueError('Each agent needs a 3D position')
  for v in a['position']:number(v,-20,20,'agent.position')
  if not all(isinstance(a['label'].get(lang),str) and a['label'][lang].strip() for lang in ['en','zh']):raise ValueError('Agent labels need en and zh')
 for a in c['agents']:
  if not re.fullmatch('[a-z][a-z0-9-]*',a['id']) or a['id'] in seen:raise ValueError('Agent ids must be unique')
  if a['color'] not in c['palette']:raise ValueError('Unknown agent palette color')
  seen.add(a['id'])
 return c

def avatar_html(data:dict,lang:str,root:Path)->str:
 avatar=data.get('avatar',{});src=avatar.get('src','')
 label=escape(avatar.get('placeholderLabel',{}).get(lang,'PORTRAIT / PENDING'))
 if not src:
  return f'<div class="avatar-block"><div class="avatar-placeholder" role="img" aria-label="{label}"><span>YZ</span><i></i></div><span class="avatar-note mono">{label}</span></div>'
 # Only local assets can be exposed; prevent path traversal and accidental private-file publication.
 path=Path(src)
 if path.is_absolute() or '..' in path.parts or not src.startswith('assets/portrait/') or path.suffix.lower() not in ['.png','.jpg','.jpeg','.webp']:
  raise ValueError('avatar.src must be a local PNG/JPEG/WebP under assets/portrait/')
 if not (root/'public'/path).is_file():raise ValueError('Avatar file does not exist: '+src)
 alt=escape(avatar.get('alt',{}).get(lang,'Portrait of Yuteng Zhang'))
 return f'<div class="avatar-block"><img class="profile-avatar" src="{escape(src)}" alt="{alt}" width="96" height="96" fetchpriority="high"></div>'
