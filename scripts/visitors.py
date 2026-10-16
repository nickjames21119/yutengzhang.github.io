"""Build a self-hosted world map. No browser-side map vendor or geolocation API."""
from pathlib import Path
from html import escape
from urllib.parse import urlparse
import json

def visitor_config(root: Path) -> dict:
    c=json.loads((root/'data/visitors.json').read_text(encoding='utf-8'))
    if not isinstance(c.get('enabled'),bool): raise ValueError('visitors.enabled must be boolean')
    endpoint=c.get('apiBase','')
    u=urlparse(endpoint)
    if not (endpoint=='./api' or endpoint=='/api' or (u.scheme=='https' and u.netloc and not u.username and not u.password and not u.query and not u.fragment)):
        raise ValueError('visitors.apiBase must be ./api, /api or an HTTPS API base without credentials/query/fragment')
    for key,lo,hi in [('refreshSeconds',30,3600),('requestTimeoutMs',1000,15000)]:
        if type(c.get(key)) is not int or not lo<=c[key]<=hi: raise ValueError('Invalid visitors.'+key)
    return c

def land_paths(root: Path) -> str:
    geo=json.loads((root/'data/maps/land.geojson').read_text(encoding='utf-8'))
    out=[]
    for f in geo['features']:
        g=f['geometry'];polygons=g['coordinates'] if g['type']=='MultiPolygon' else [g['coordinates']]
        for polygon in polygons:
            d=[]
            for ring in polygon:
                d.append('M'+'L'.join(f'{(lon+180)/360*1000:.2f},{(90-lat)/180*500:.2f}' for lon,lat,*_ in ring)+'Z')
            out.append('<path d="'+''.join(d)+'"/>')
    return ''.join(out)

def visitors_html(root: Path, lang: str) -> str:
    if not visitor_config(root)['enabled']: return ''
    z=lang=='zh'
    text={
       'heading':'访客地图。' if z else 'Visitors.',
       'subtitle':'来自世界各地的访问。' if z else 'A view of where visitors connect from.',
       'label':'访客 IP 推断的大致区域分布地图' if z else 'Map of approximate regions inferred from visitor IP addresses',
       'loading':'正在连接访客服务…' if z else 'Connecting to the visitor service…',
       'total':'日去重访问' if z else 'Daily-deduplicated visits',
       'regions':'地区' if z else 'Regions',
       'period':'近 90 天' if z else 'LAST 90 DAYS',
       'consent':'将你的大致区域加入地图？' if z else 'Add your approximate region to the map?',
       'yes':'加入我的访问' if z else 'Share my region',
       'no':'不记录我' if z else 'Not now',
       'settings':'隐私选项' if z else 'Privacy settings',
       'privacy_title':'关于访客记录' if z else 'About visitor records',
       'privacy':'仅在同意后记录。服务器根据网络 IP 推断粗略位置，按 2° 网格合并。应用数据库不保存原始 IP；使用按日变化的 HMAC 标识去重，并保留不超过约 48 小时。区域统计保留 90 天，不是独立人数或精确定位。共享网络、VPN 与移动网络可能影响位置和计数。尊重浏览器 DNT / GPC 偏好。不保存浏览路径、设备指纹或 GPS。托管平台仍可能根据其设置处理连接日志。' if z else 'Visits are recorded only after you agree. The server infers a coarse region from the network IP and groups it into 2° cells. The application database never stores raw IPs. A daily-changing HMAC is retained for up to about 48 hours for deduplication; regional totals are retained for 90 days. Counts are not unique people or precise locations. Shared networks, VPNs and mobile networks can affect both location and counts. DNT / GPC preferences are respected. No browsing paths, device fingerprints or GPS are collected. The hosting provider may separately process connection logs.',
       'noscript':'启用 JavaScript 后可查看真实聚合访问；当前地图不包含模拟访客。' if z else 'Enable JavaScript to load recorded visits. This map contains no simulated visitors.',
    }
    grid=''.join(f'<path d="M{x} 0V500"/>' for x in range(0,1001,83))+''.join(f'<path d="M0 {y}H1000"/>' for y in range(0,501,83))
    return f'''<section class="visitors-section container" id="visitors" data-visitors aria-labelledby="visitors-heading">
      <div class="visitors-heading"><div><h2 id="visitors-heading">{text['heading']}</h2></div>
        <div class="visitor-totals sr-only"><div><strong data-visit-total>—</strong><span>{text['total']}</span></div><div><strong data-visit-regions>—</strong><span>{text['regions']}</span></div></div>
      </div>
      <div class="visitor-map-wrap">
        <svg class="visitor-map" viewBox="0 0 1000 500" aria-label="{text['label']}" role="img">
          <defs><pattern id="land-dots" width="4" height="4" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r=".7" fill="currentColor"/></pattern><linearGradient id="land-fill" x1="0" y1="0" x2="0" y2="1"><stop stop-color="var(--map-land-top)"/><stop offset="1" stop-color="var(--map-land-bottom)"/></linearGradient></defs>
          <g class="map-graticule">{grid}</g><g class="map-land" fill-rule="evenodd">{land_paths(root)}</g><g class="map-markers" data-map-markers></g>
        </svg>
        <div class="map-tooltip" role="status" data-map-tooltip hidden></div>
        
      </div>
      <div class="visitor-status-row"><span class="visitor-status sr-only" data-visit-status role="status">{text['loading']}</span><button type="button" class="text-link js-only" data-visit-settings aria-label="{text['settings']}" title="{text['settings']}">◎</button></div>
      <div class="visitor-consent" data-visit-consent hidden><p>{text['consent']}</p><div><button type="button" class="button button-outline" data-visit-allow>{text['yes']}</button><button type="button" class="text-link" data-visit-deny>{text['no']}</button></div></div>
      
      
    </section>'''
