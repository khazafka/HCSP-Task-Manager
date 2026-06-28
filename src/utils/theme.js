const KEY = 'hcsp-theme';

export function getTheme() {
  return localStorage.getItem(KEY) || 'telkom';
}

export function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(KEY, theme);
}

export function initTheme() {
  applyTheme(getTheme());
}
