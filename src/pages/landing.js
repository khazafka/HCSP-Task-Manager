import { getLang, langLabel, setLang, t } from '../utils/i18n.js';

const ICON = {
  arrow: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></svg>`,
  list: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 6h13M8 12h13M8 18h13"/><path d="M3 6h.01M3 12h.01M3 18h.01"/></svg>`,
  building: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18"/><path d="M5 21V5a2 2 0 0 1 2-2h7v18"/><path d="M14 8h3a2 2 0 0 1 2 2v11"/><path d="M9 7h1M9 11h1M9 15h1"/></svg>`,
  clock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>`,
  shield: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/></svg>`,
  report: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/><path d="M8 13h8M8 17h5"/></svg>`,
  users: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="m20 6-11 11-5-5"/></svg>`,
  globe: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18Z"/></svg>`,
};

export function renderLanding(onLogin) {
  const nextLang = getLang() === 'en' ? 'id' : 'en';

  document.querySelector('#app').innerHTML = `
    <main class="landing-page">
      <header class="landing-nav">
        <div class="landing-container nav-inner">
          <a class="brand-lockup" href="#top" aria-label="HCSP-OM home">
            <span class="brand-mark">T</span>
            <span>
              <strong>Telkom HCSP-OM</strong>
              <small>${t('land.brandSub')}</small>
            </span>
          </a>

          <nav class="landing-links" aria-label="Landing navigation">
            <a href="#features">${t('land.navFeatures')}</a>
            <a href="#workflow">${t('land.navWorkflow')}</a>
            <a href="#benefits">${t('land.navBenefits')}</a>
            <a href="#contact">${t('land.navContact')}</a>
          </nav>

          <div style="display:flex;align-items:center;gap:10px">
            <button class="icon-btn lang-btn" id="lpLangBtn" data-next-lang="${nextLang}" aria-label="${t('land.switchLang')}" title="${t('land.switchLang')}">
              ${ICON.globe}<span>${langLabel()}</span>
            </button>
            <button class="landing-btn landing-btn-primary" id="lpLoginTop">${t('land.getStarted')}</button>
          </div>
        </div>
      </header>

      <section class="landing-hero" id="top">
        <div class="landing-container hero-grid">
          <div class="hero-copy">
            <p class="landing-eyebrow">${t('land.heroEyebrow')}</p>
            <h1>${t('land.heroHeading')}</h1>
            <p class="hero-sub">${t('land.heroBody')}</p>

            <div class="hero-actions">
              <button class="landing-btn landing-btn-primary landing-btn-lg" id="lpStart">${t('land.requestAccess')} ${ICON.arrow}</button>
              <a class="landing-btn landing-btn-outline landing-btn-lg" href="#features">${ICON.list} ${t('land.learnMore')}</a>
            </div>
          </div>

          <div class="hero-visual" aria-label="${t('land.previewAria')}">
            <div class="hero-glow"></div>
            <div class="workflow-card">
              <div class="workflow-head">
                <div>
                  <span>${t('land.previewKicker')}</span>
                  <h2>${t('land.previewTitle')}</h2>
                </div>
                <div class="workflow-badge">HC</div>
              </div>

              <div class="workflow-steps">
                ${workflowStep('1', t('land.step1Title'), t('land.step1Desc'), '82')}
                ${workflowStep('2', t('land.step2Title'), t('land.step2Desc'), '64')}
                ${workflowStep('3', t('land.step3Title'), t('land.step3Desc'), '72')}
              </div>

              <div class="hero-stats">
                <div><strong>24/7</strong><span>${t('land.statAccess')}</span></div>
                <div><strong>${t('land.statFast')}</strong><span>${t('land.statFlow')}</span></div>
                <div><strong>${t('land.statSecure')}</strong><span>RBAC</span></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="landing-section" id="features">
        <div class="landing-container">
          <div class="section-head">
            <p class="landing-eyebrow">${t('land.navFeatures')}</p>
            <h2>${t('land.featuresHeading')}</h2>
            <p>${t('land.featuresBody')}</p>
          </div>

          <div class="feature-grid">
            ${featureCard(ICON.list, t('land.cardOrdersTitle'), t('land.cardOrdersDesc'))}
            ${featureCard(ICON.building, t('land.cardUnitTitle'), t('land.cardUnitDesc'))}
            ${featureCard(ICON.clock, t('land.cardStatusTitle'), t('land.cardStatusDesc'))}
            ${featureCard(ICON.report, t('land.cardReportTitle'), t('land.cardReportDesc'))}
            ${featureCard(ICON.users, t('land.cardNotifTitle'), t('land.cardNotifDesc'))}
            ${featureCard(ICON.shield, t('land.cardRbacTitle'), t('land.cardRbacDesc'))}
          </div>
        </div>
      </section>

      <section class="landing-section workflow-section" id="workflow">
        <div class="landing-container">
          <div class="section-head">
            <p class="landing-eyebrow">${t('land.navWorkflow')}</p>
            <h2>${t('land.workflowHeading')}</h2>
          </div>

          <div class="process-grid">
            ${processCard('01', t('land.process1Title'), t('land.process1Desc'))}
            ${processCard('02', t('land.process2Title'), t('land.process2Desc'))}
            ${processCard('03', t('land.process3Title'), t('land.process3Desc'))}
          </div>
        </div>
      </section>

      <section class="landing-section" id="benefits">
        <div class="landing-container benefit-grid">
          <div>
            <p class="landing-eyebrow">${t('land.whyEyebrow')}</p>
            <h2>${t('land.whyHeading')}</h2>
            <p class="benefit-copy">${t('land.whyBody')}</p>
            <div class="benefit-list">
              ${benefit(t('land.benefit1'))}
              ${benefit(t('land.benefit2'))}
              ${benefit(t('land.benefit3'))}
              ${benefit(t('land.benefit4'))}
            </div>
          </div>

          <div class="impact-card">
            <h3>${t('land.impactTitle')}</h3>
            <div class="impact-grid">
              <div><strong>100%</strong><span>${t('land.impactCentralized')}</span></div>
              <div><strong>7</strong><span>${t('land.impactStatuses')}</span></div>
              <div><strong>5</strong><span>${t('land.impactRoles')}</span></div>
              <div><strong>PDF/XLSX</strong><span>${t('land.impactExports')}</span></div>
            </div>
          </div>
        </div>
      </section>

      <section class="landing-cta" id="contact">
        <div class="landing-container cta-inner">
          <p class="landing-eyebrow">${t('land.getStarted')}</p>
          <h2>${t('land.ctaHeading')}</h2>
          <p>${t('land.ctaBody')}</p>
          <button class="landing-btn landing-btn-primary landing-btn-lg" id="lpStart2">${t('land.openDashboard')}</button>
        </div>
      </section>

      <footer class="landing-footer">
        <div class="landing-container footer-inner">
          <div>
            <strong>Telkom HCSP-OM</strong>
            <span>${t('land.brandSub')}</span>
          </div>
          <p>&copy; ${new Date().getFullYear()} ${t('land.rights')}</p>
        </div>
      </footer>
    </main>
  `;

  document.querySelector('#lpLoginTop').addEventListener('click', onLogin);
  document.querySelector('#lpStart').addEventListener('click', onLogin);
  document.querySelector('#lpStart2').addEventListener('click', onLogin);
  document.querySelector('#lpLangBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    setLang(e.currentTarget.dataset.nextLang);
  });
}

function workflowStep(number, title, desc, width) {
  return `
    <div class="workflow-step">
      <div class="step-number">${number}</div>
      <div>
        <h3>${title}</h3>
        <p>${desc}</p>
        <div class="step-track"><span style="width:${width}%"></span></div>
      </div>
    </div>
  `;
}

function featureCard(icon, title, desc) {
  return `
    <article class="feature-card">
      <div class="feature-icon">${icon}</div>
      <h3>${title}</h3>
      <p>${desc}</p>
    </article>
  `;
}

function processCard(number, title, desc) {
  return `
    <article class="process-card">
      <span>${number}</span>
      <h3>${title}</h3>
      <p>${desc}</p>
    </article>
  `;
}

function benefit(text) {
  return `<p><span>${ICON.check}</span>${text}</p>`;
}
