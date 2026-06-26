const KEY = 'hcsp-theme';

export function getTheme() {
  return localStorage.getItem(KEY) || 'dark';
}

export function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(KEY, theme);
}

export function initTheme() {
  applyTheme(getTheme());
}
