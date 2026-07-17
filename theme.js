import { auth, db, doc, setDoc } from './firebase.js';
import { state } from './state.js';
import { showFeedback } from './ui.js';

const THEME_STORAGE_KEY = 'irontrack-theme';

let autoMediaQuery = null;
let autoListenerAttached = false;

function updateMetaThemeColor() {
  const el = document.querySelector('meta[name="theme-color"]');
  if (el) el.setAttribute('content', '#27dd33');
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
 * Get QR code colors derived from current theme state.
 * Reads the document's dark/light class and system preference to determine
 * appropriate contrast colors for QR code rendering.
 * @returns {{ dots: string, bg: string, accent: string }}
 */
export function getThemeQrColors() {
  const html = document.documentElement;
  const isDark = html.classList.contains('mdui-theme-dark') ||
    (!html.classList.contains('mdui-theme-light') && window.matchMedia('(prefers-color-scheme: dark)').matches);
  return isDark
    ? { dots: "#f8fafc", bg: "#0f172a", accent: "#27dd33" }
    : { dots: "#1e293b", bg: "#ffffff", accent: "#27dd33" };
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
