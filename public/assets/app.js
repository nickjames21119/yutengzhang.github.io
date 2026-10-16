/* Progressive enhancement only: all academic content is rendered in HTML. */
(() => {
  'use strict';
  document.documentElement.classList.add('js');
  const uiElement = document.getElementById('ui-data');
  if (!uiElement) return;
  const ui = JSON.parse(uiElement.textContent);
  const text = ui.messages;
  const toast = document.getElementById('toast');
  let toastTimer;
  function notify(message) {
    if (!toast) return;
    clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add('visible');
    toastTimer = setTimeout(() => toast.classList.remove('visible'), 3400);
  }
  function store(key, value) { try { localStorage.setItem(key, value); } catch (_) { /* file/private modes may deny storage */ } }
  function updateThemeButton() {
    const button = document.querySelector('.theme-toggle');
    if (!button) return;
    const light = document.documentElement.dataset.theme === 'light';
    button.setAttribute('aria-pressed', String(light));
    const label = ui.lang === 'zh' ? (light ? '切换为深色主题' : '切换为浅色主题') : (light ? 'Switch to dark theme' : 'Switch to light theme');
    button.setAttribute('aria-label', label);
    button.title = label;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', light ? '#f8f6f0' : '#0c0c0b');
  }
  document.querySelector('.theme-toggle')?.addEventListener('click', () => {
    const theme = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
    document.documentElement.dataset.theme = theme;
    store('yz-theme', theme);
    updateThemeButton();
    document.dispatchEvent(new CustomEvent('yz:theme', { detail: theme }));
    notify(theme === 'light' ? text.switchedLight : text.switchedDark);
  });
  updateThemeButton();

  const nav = document.getElementById('main-nav');
  const menuButton = document.querySelector('.menu-toggle');
  function closeMenu() {
    nav?.classList.remove('is-open');
    menuButton?.setAttribute('aria-expanded', 'false');
    menuButton?.setAttribute('aria-label', text.openMenu);
  }
  menuButton?.addEventListener('click', () => {
    const open = menuButton.getAttribute('aria-expanded') !== 'true';
    nav?.classList.toggle('is-open', open);
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', open ? text.closeMenu : text.openMenu);
  });
  nav?.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
  document.addEventListener('click', event => {
    if (nav?.classList.contains('is-open') && !event.target.closest('.site-header')) closeMenu();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menuButton?.getAttribute('aria-expanded') === 'true') {
      closeMenu(); menuButton.focus();
    }
  });
  const mobile = window.matchMedia('(max-width: 740px)');
  mobile.addEventListener?.('change', closeMenu);
  if ('IntersectionObserver' in window) {
    const navLinks = Array.from(nav?.querySelectorAll('a') || []);
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        navLinks.forEach(link => {
          if (link.getAttribute('href') === '#' + entry.target.id) link.setAttribute('aria-current', 'location');
          else link.removeAttribute('aria-current');
        });
      }
    }, { rootMargin: '-15% 0px -50% 0px', threshold: 0 });
    document.querySelectorAll('main section[id]').forEach(section => observer.observe(section));
  }

  // With a short publication list there is no category UI or search state.
  // All papers remain accessible through their permanent #pub-* anchors.

  // Clipboard uses a fallback for file:// and restricted browser contexts.
  async function copyText(value, fallbackElement = null) {
    if (navigator.clipboard && window.isSecureContext) {
      try { await navigator.clipboard.writeText(value); notify(text.copied); return true; } catch (_) { /* fall through */ }
    }
    const textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.setAttribute('readonly', '');
    textarea.style.cssText = 'position:fixed;left:0;top:0;opacity:0;width:1px;height:1px;';
    // A modal blocks focus outside it, so keep the fallback inside the active dialog.
    const parent = document.querySelector('dialog[open]') || document.body;
    parent.appendChild(textarea);
    const focused = document.activeElement;
    textarea.focus(); textarea.select();
    let copied = false;
    try { copied = document.execCommand('copy'); } catch (_) { /* selection fallback */ }
    textarea.remove();
    if (focused instanceof HTMLElement) focused.focus({ preventScroll: true });
    if (!copied && fallbackElement) {
      const range = document.createRange();
      range.selectNodeContents(fallbackElement);
      const selection = window.getSelection();
      selection?.removeAllRanges(); selection?.addRange(range);
    }
    notify(copied ? text.copied : text.copyFailed);
    return copied;
  }
  document.querySelector('.copy-email')?.addEventListener('click', event => {
    copyText(event.currentTarget.dataset.email, document.querySelector('.email-link'));
  });

})();
