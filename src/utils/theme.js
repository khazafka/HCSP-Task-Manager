const KEY = 'hcsp-theme';
const VALID = ['light', 'dark'];

export function getTheme() {
  const saved = localStorage.getItem(KEY);
  // 'telkom' was the old name for the light theme; map any legacy value to 'light'.
  if (saved === 'dark') return 'dark';
  return 'light';
}

export function applyTheme(theme) {
  const t = VALID.includes(theme) ? theme : 'light';
  document.documentElement.setAttribute('data-theme', t);
  localStorage.setItem(KEY, t);
}

export function initTheme() {
  applyTheme(getTheme());
}
