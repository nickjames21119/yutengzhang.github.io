#!/usr/bin/env python3
"""Validate and write public visitor-service configuration. No secrets or network.

Example: python scripts/configure_visitors.py --database-id <Cloudflare D1 UUID>
Use --api-base and repeated --allow-origin for a separate GitHub Pages frontend.
This script expects the supplied wrangler.jsonc to remain valid JSON (no comments).
"""
from __future__ import annotations
import argparse, json, re, uuid
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]

def https_value(value: str, *, origin: bool = False) -> str:
    """Reject credentials, fragments, relative URLs and unintended origin paths."""
    u = urlsplit(value)
    if (u.scheme != 'https' or not u.hostname or u.username or u.password
            or u.query or u.fragment or any(c.isspace() for c in value)):
        raise ValueError('Use an HTTPS URL without credentials, spaces, query or fragment')
    try:
        _ = u.port
    except ValueError as error:
        raise ValueError('Invalid HTTPS port') from error
    if origin and u.path not in ('', '/'):
        raise ValueError('Allowed origin must not contain a repository or /api path')
    return value.rstrip('/')

def configure(root: Path, *, database_id: str | None = None,
              api_base: str | None = None, allow_origins: list[str] | None = None,
              worker_name: str | None = None) -> None:
    config_path, visitor_path = root/'wrangler.jsonc', root/'data/visitors.json'
    config = json.loads(config_path.read_text(encoding='utf-8'))
    visitors = json.loads(visitor_path.read_text(encoding='utf-8'))
    # Validate every supplied argument before changing either file.
    if database_id is not None:
        try:
            parsed = uuid.UUID(database_id)
        except ValueError as error:
            raise ValueError('database-id must be your actual D1 UUID') from error
        if parsed.int == 0:
            raise ValueError('The all-zero database ID is not a deployed database')
        config['d1_databases'][0]['database_id'] = str(parsed)
    if api_base is not None:
        visitors['apiBase'] = api_base if api_base in ('./api', '/api') else https_value(api_base)
    if allow_origins is not None:
        config['vars']['ALLOWED_ORIGINS'] = ','.join(dict.fromkeys(https_value(v, origin=True) for v in allow_origins))
    if worker_name is not None:
        if not re.fullmatch(r'[a-z][a-z0-9-]{0,61}[a-z0-9]|[a-z]', worker_name):
            raise ValueError('worker-name must be 1–63 lowercase letters/digits/hyphens, starting with a letter')
        config['name'] = worker_name
    for path, data in [(config_path, config), (visitor_path, visitors)]:
        # Replacement is atomic per file. A disk interruption may require rerunning.
        tmp = path.with_name(path.name+'.tmp')
        try:
            tmp.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
            tmp.replace(path)
        finally:
            tmp.unlink(missing_ok=True)

def main() -> None:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--database-id')
    p.add_argument('--api-base',help='./api for same-origin; HTTPS base ending /api for separate hosting')
    p.add_argument('--allow-origin',action='append',default=None,help='Repeat for each allowed frontend HTTPS origin, no path')
    p.add_argument('--clear-origins',action='store_true',help='Remove cross-origin frontend permissions')
    p.add_argument('--worker-name')
    a = p.parse_args()
    if a.clear_origins and a.allow_origin:
        p.error('Do not combine --clear-origins and --allow-origin')
    if not any([a.database_id,a.api_base,a.allow_origin,a.worker_name,a.clear_origins]):
        p.error('Provide at least one configuration option')
    try:
        configure(ROOT,database_id=a.database_id,api_base=a.api_base,
                  allow_origins=[] if a.clear_origins else a.allow_origin,worker_name=a.worker_name)
    except (OSError,ValueError,KeyError,TypeError) as error:
        p.exit(1,f'Configuration failed: {error}\n')
    print('Configuration saved. Rebuild with: python scripts/build.py')
    print('No cloud resources were created, no secrets set and nothing was deployed.')
if __name__ == '__main__':
    main()
