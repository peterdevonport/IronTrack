import { auth, db, doc, setDoc } from './firebase.js';
import { state } from './state.js';
import { showFeedback } from './ui.js';

const THEME_STORAGE_KEY = 'irontrack-theme';
const LIGHT_META = { color: '#27dd33', scheme: 'light' };
const DARK_META = { color: '#27dd33', scheme: 'dark' };

let autoMediaQuery = null;
let autoListenerAttached = false;

function getMetaTag(scheme) {
  return document.querySelector(`meta[name="theme-color"][media="(prefers-color-scheme: ${scheme})"]`);
}

function getDefaultMeta() {
  return document.querySelector('meta[name="theme-color"]:not([media])');
}

function updateMetaThemeColor(mode, isDarkOs) {
  if (mode === 'light') {
    const el = getMetaTag('light') || getDefaultMeta();
    if (el) el.setAttribute('content', LIGHT_META.color);
  } else if (mode === 'dark') {
    const el = getMetaTag('dark') || getDefaultMeta();
    if (el) el.setAttribute('content', DARK_META.color);
  } else {
    const isDark = isDarkOs !== undefined ? isDarkOs : window.matchMedia('(prefers-color-scheme: dark)').matches;
    const scheme = isDark ? 'dark' : 'light';
    const el = getMetaTag(scheme);
    if (el) {
      el.setAttribute('content', isDark ? DARK_META.color : LIGHT_META.color);
    }
  }
}

function applyThemeClass(mode) {
  const html = document.documentElement;

  html.classList.remove('mdui-theme-dark', 'mdui-theme-light', 'mdui-theme-auto');

  if (mode === 'auto') {
    html.classList.add('mdui-theme-auto');
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    updateMetaThemeColor('auto', isDark);
  } else if (mode === 'light') {
    html.classList.add('mdui-theme-light');
    updateMetaThemeColor('light');
  } else {
    html.classList.add('mdui-theme-dark');
    updateMetaThemeColor('dark');
  }
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
      updateMetaThemeColor('auto', e.matches);
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

export function wireThemeToggle() {
  document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.theme;
      setTheme(mode);
      showFeedback(`Theme set to ${mode}`, 'emerald', 'theme-feedback');
    });
  });
}
