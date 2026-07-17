import { auth, db, doc, setDoc } from './firebase.js';
import { state } from './state.js';
import { showFeedback } from './ui.js';

const THEME_STORAGE_KEY = 'irontrack-theme';

let autoMediaQuery = null;
let autoListenerAttached = false;

/**
 * Read the canonical brand colour from the --color-brand CSS custom property.
 * Falls back to the hardcoded hex only if the property is unavailable (edge case).
 */
function getBrandColor() {
  const value = getComputedStyle(document.documentElement).getPropertyValue('--color-brand').trim();
  return value || '#27dd33';
}

function updateMetaThemeColor() {
  const el = document.querySelector('meta[name="theme-color"]');
  if (el) el.setAttribute('content', getBrandColor());
}

function applyThemeClass(mode) {
  const html = document.documentElement;

  html.classList.remove('mdui-theme-dark', 'mdui-theme-light', 'mdui-theme-auto');

  if (mode === 'auto') {
    html.classList.add('mdui-theme-auto');
  } else if (mode === 'light') {
    html.classList.add('mdui-theme-light');
  } else {
    html.classList.add('mdui-theme-dark');
  }
  updateMetaThemeColor();
}

function updateToggleUI(mode) {
  document.querySelectorAll('.theme-btn').forEach(btn => {
    const btnTheme = btn.dataset.theme;
    if (btnTheme === mode) {
      btn.className = 'btn-core is-primary btn-size-row theme-btn';
    } else {
      btn.className = 'btn-core is-ghost btn-size-row theme-btn';
    }
  });
}

function initAutoListener() {
  if (autoListenerAttached) return;
  try {
    autoMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e) => {
      const saved = localStorage.getItem(THEME_STORAGE_KEY) || 'auto';
      if (saved === 'auto') {
        applyThemeClass('auto');
      }
      updateMetaThemeColor();
    };
    if (autoMediaQuery.addEventListener) {
      autoMediaQuery.addEventListener('change', handler);
    } else {
      autoMediaQuery.addListener(handler);
    }
    autoListenerAttached = true;
  } catch (err) {
    console.error('Failed to init auto theme listener:', err);
  }
}

async function persistTheme(mode) {
  localStorage.setItem(THEME_STORAGE_KEY, mode);
  state.user.theme = mode;

  if (auth.currentUser) {
    try {
      await setDoc(doc(db, 'profiles', auth.currentUser.uid), { theme: mode }, { merge: true });
    } catch (err) {
      console.error('Failed to persist theme to Firestore:', err);
    }
  }
}

export function setTheme(mode, { persist = true } = {}) {
  applyThemeClass(mode);
  updateToggleUI(mode);
  initAutoListener();

  if (persist) {
    persistTheme(mode);
  }
}

export function initTheme(savedTheme) {
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  const mode = stored || savedTheme || 'auto';

  applyThemeClass(mode);
  state.user.theme = mode;

  if (stored !== mode && auth.currentUser) {
    persistTheme(mode);
  }

  if (typeof mdui !== 'undefined' && mdui.setTheme) {
    try {
      mdui.setTheme(mode);
    } catch (err) {
      console.error('mdui.setTheme failed:', err);
    }
  }

  initAutoListener();
  updateToggleUI(mode);
}

/**
 * Returns QR code dot/background/accent colours derived from the current theme.
 * Checks for explicit mdui theme classes first, then falls back to the user's
 * `prefers-color-scheme` media query.
 *
 * @returns {{ dots: string, bg: string, accent: string }}
 */
export function getThemeQrColors() {
  const html = document.documentElement;
  const isDark = html.classList.contains('mdui-theme-dark') ||
    (!html.classList.contains('mdui-theme-light') && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const brand = getBrandColor();
  return isDark
    ? { dots: "#f8fafc", bg: "#0f172a", accent: brand }
    : { dots: "#1e293b", bg: "#ffffff", accent: brand };
}

export function wireThemeToggle() {
  document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.theme;
      setTheme(mode);
      showFeedback(`Theme set to ${mode}`, 'emerald', 'theme-feedback');
    });
  });
}
