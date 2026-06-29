import { t } from '../utils/i18n.js';

const ICON = {
  orders: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7l9-4 9 4-9 4-9-4Z"/><path d="M3 7v10l9 4 9-4V7"/><path d="M12 11v10"/></svg>`,
  track: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>`,
  wa: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.5 8.5 0 0 1-12.3 7.6L3 21l1.9-5.6A8.5 8.5 0 1 1 21 11.5Z"/></svg>`,
  report: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/><path d="M8 13h8M8 17h5"/></svg>`,
  roles: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13A4 4 0 0 1 16 11"/></svg>`,
  export: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
};

export function renderLanding(onLogin) {
  const features = [
    ['f1', ICON.orders], ['f2', ICON.track], ['f3', ICON.wa],
    ['f4', ICON.report], ['f5', ICON.roles], ['f6', ICON.export],
  ];

  document.querySelector('#app').innerHTML = `
    <div class="landing">
      <header class="lp-nav">
        <div class="lp-logo"><span class="lp-mark">HC</span> HCSP-OM</div>
        <div class="lp-nav-right">
          <a href="#features" class="lp-link">${t('land.features')}</a>
          <button class="lp-btn lp-btn-primary" id="lpLoginTop">${t('land.login')}</button>
        </div>
      </header>

      <section class="lp-hero">
        <span class="lp-eyebrow">${t('land.eyebrow')}</span>
        <h1>${t('land.heroTitle')}</h1>
        <p>${t('land.heroSub')}</p>
        <div class="lp-cta">
          <button class="lp-btn lp-btn-primary lp-btn-lg" id="lpStart">${t('land.start')}</button>
          <a href="#features" class="lp-btn lp-btn-ghost lp-btn-lg">${t('land.learn')}</a>
        </div>
      </section>

      <section class="lp-features" id="features">
        <h2>${t('land.featuresTitle')}</h2>
        <div class="lp-grid">
          ${features.map(([k, icon]) => `
            <div class="lp-card">
              <div class="lp-ic">${icon}</div>
              <h3>${t('land.' + k + 't')}</h3>
              <p>${t('land.' + k + 'd')}</p>
            </div>`).join('')}
        </div>
      </section>

      <section class="lp-band">
        <h2>${t('land.ctaTitle')}</h2>
        <p>${t('land.ctaSub')}</p>
        <button class="lp-btn lp-btn-primary lp-btn-lg" id="lpStart2">${t('land.login')}</button>
      </section>

      <footer class="lp-footer">© ${new Date().getFullYear()} ${t('land.footer')}</footer>
    </div>
  `;

  document.querySelector('#lpLoginTop').addEventListener('click', onLogin);
  document.querySelector('#lpStart').addEventListener('click', onLogin);
  document.querySelector('#lpStart2').addEventListener('click', onLogin);
}
