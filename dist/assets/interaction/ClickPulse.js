/** v7 pointer activation feedback.
 * One short gold pulse on a genuine primary click; ignores drag gestures,
 * secondary buttons and touch scrolling. Never intercepts pointer events.
 */
export class ClickPulse {
  constructor(doc = document) {
    this.doc = doc;
    this.abort = new AbortController();
    this.down = null;
    const opt = { signal: this.abort.signal, capture: true };
    doc.addEventListener('pointerdown', e => {
      if (!e.isPrimary || e.button !== 0 || e.pointerType === 'touch') {
        this.down = null;
        return;
      }
      this.down = { id: e.pointerId, x: e.clientX, y: e.clientY, when: performance.now() };
    }, opt);
    doc.addEventListener('pointerup', e => {
      const start = this.down;
      this.down = null;
      if (!start || !e.isPrimary || e.pointerId !== start.id) return;
      if (Math.hypot(e.clientX - start.x, e.clientY - start.y) > 8) return;
      if (performance.now() - start.when > 900) return;
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      if (doc.documentElement.dataset.motion !== 'running') return;
      this.pulse(e.clientX, e.clientY);
    }, opt);
    doc.addEventListener('pointercancel', () => { this.down = null; }, opt);
    addEventListener('blur', () => { this.down = null; }, {signal: this.abort.signal});
  }
  pulse(x, y) {
    const item = this.doc.createElement('span');
    item.className = 'click-pulse';
    item.setAttribute('aria-hidden', 'true');
    item.style.left = `${x}px`;
    item.style.top = `${y}px`;
    this.doc.body.append(item);
    item.addEventListener('animationend', () => item.remove(), { once: true });
    // Safety removal even if motion is subsequently paused mid-animation.
    setTimeout(() => item.remove(), 1000);
  }
  dispose() { this.abort.abort(); this.down = null; this.doc.querySelectorAll('.click-pulse').forEach(el => el.remove()); }
}
