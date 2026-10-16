# v5.1 changes / v5.1 更新记录

- Two About paragraphs supplied by the owner, EN exactly as provided, and 2-paragraph ZH translation. Modify `data/profile.json`.
- Distinctive orbit/network logo, maintained as inline SVG and matching SVG favicon. Modify `brand_svg` in `scripts/build.py` and `public/assets/favicon.svg`.
- Removed the standalone 4 research directions section, its navigation anchor, and all *visible* CV links. CV generator is retained internally for future re-enabling.
- Added a compact, accessible floating publication timeline as a third hero column on wide desktops; on smaller screens it moves below the city. `data/profile.json` defines short titles and dates.
- Accepted ICDM and SIGSPATIAL papers do not show external Paper links. Published articles retain their DOI links.
- Existing animated, opt-in visitor map and Cloudflare Worker/D1 code are retained, including no fake points and a status accessible to assistive technology. The map only shows a title, the map, and a discreet privacy settings icon; counters are hidden visually.
- The site stays compatible with GitHub Pages. Real visitor records require one-time configuration and deployment of Cloudflare Worker/D1; GitHub Pages alone cannot store IP locations. See `GITHUB_PAGES_VISITOR_MAP_V5.md`.

## Note about dates

Timeline uses verified publication issue months for TRD (Jul 2026) and TRC (Jan 2026), online publication for GANSamples-ac4C (Feb 2024). Acceptance dates were not supplied, so accepted papers show year only; no fabricated month. Accepted papers are grouped first.
