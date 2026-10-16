import { ClickPulse } from './ClickPulse.js';
const pulse = new ClickPulse();
addEventListener('pagehide', e => { if (!e.persisted) pulse.dispose(); });
