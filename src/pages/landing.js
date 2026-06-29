const ICON = {
  arrow: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></svg>`,
  list: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 6h13M8 12h13M8 18h13"/><path d="M3 6h.01M3 12h.01M3 18h.01"/></svg>`,
  building: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18"/><path d="M5 21V5a2 2 0 0 1 2-2h7v18"/><path d="M14 8h3a2 2 0 0 1 2 2v11"/><path d="M9 7h1M9 11h1M9 15h1"/></svg>`,
  clock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>`,
  shield: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/></svg>`,
  report: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/><path d="M8 13h8M8 17h5"/></svg>`,
  users: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="m20 6-11 11-5-5"/></svg>`,
};

export function renderLanding(onLogin) {
  document.querySelector('#app').innerHTML = `
    <main class="landing-page">
      <header class="landing-nav">
        <div class="landing-container nav-inner">
          <a class="brand-lockup" href="#top" aria-label="HCSP-OM home">
            <span class="brand-mark">T</span>
            <span>
              <strong>Telkom HCSP-OM</strong>
              <small>Order Management System</small>
            </span>
          </a>

          <nav class="landing-links" aria-label="Landing navigation">
            <a href="#features">Features</a>
            <a href="#workflow">Workflow</a>
            <a href="#benefits">Benefits</a>
            <a href="#contact">Contact</a>
          </nav>

          <button class="landing-btn landing-btn-primary" id="lpLoginTop">Get Started</button>
        </div>
      </header>

      <section class="landing-hero" id="top">
        <div class="landing-container hero-grid">
          <div class="hero-copy">
            <p class="landing-eyebrow">Human Capital Order Management</p>
            <h1>Centralized Order Management for Every Business Unit</h1>
            <p class="hero-sub">
              HCSP-OM helps Human Capital teams submit, assign, track, report, and close service orders through one secure internal workflow.
            </p>

            <div class="hero-actions">
              <button class="landing-btn landing-btn-primary landing-btn-lg" id="lpStart">Request Access ${ICON.arrow}</button>
              <a class="landing-btn landing-btn-outline landing-btn-lg" href="#features">${ICON.list} Learn More</a>
            </div>
          </div>

          <div class="hero-visual" aria-label="Order workflow preview">
            <div class="hero-glow"></div>
            <div class="workflow-card">
              <div class="workflow-head">
                <div>
                  <span>Operational Overview</span>
                  <h2>Order Workflow</h2>
                </div>
                <div class="workflow-badge">HC</div>
              </div>

              <div class="workflow-steps">
                ${workflowStep('1', 'Submit Order', 'Customer submits service item, unit, contact, and request details.', '82')}
                ${workflowStep('2', 'Assign PIC', 'HCAM assigns Team Solution and sends WhatsApp notifications.', '64')}
                ${workflowStep('3', 'Track & Report', 'Team updates status, uploads work reports, and closes evidence.', '72')}
              </div>

              <div class="hero-stats">
                <div><strong>24/7</strong><span>Access</span></div>
                <div><strong>Fast</strong><span>Flow</span></div>
                <div><strong>Secure</strong><span>RBAC</span></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="landing-section" id="features">
        <div class="landing-container">
          <div class="section-head">
            <p class="landing-eyebrow">Features</p>
            <h2>Built for enterprise order operations</h2>
            <p>Everything needed to manage requests clearly, securely, and efficiently across Human Capital business units.</p>
          </div>

          <div class="feature-grid">
            ${featureCard(ICON.list, 'Centralized Orders', 'Create draft or submitted orders with service codes, business units, contacts, descriptions, and lifecycle status.')}
            ${featureCard(ICON.building, 'Business Unit Visibility', 'See ownership by unit, assignment, and status so HCAM and Management can monitor active work.')}
            ${featureCard(ICON.clock, 'Status Tracking', 'Track Draft, Submitted, Assigned, In Progress, Review, Completed, and Closed with history.')}
            ${featureCard(ICON.report, 'Work Reports', 'Team Solution can submit dated reports, notes, attachments, PDFs, Excel recaps, and ZIP downloads.')}
            ${featureCard(ICON.users, 'WhatsApp Notifications', 'Notify HCAM, assignees, and stakeholders through the existing Fonnte notification bridge.')}
            ${featureCard(ICON.shield, 'Role-Based Access', 'Admin, HCAM, Team Solution, Customer, and Management each get scoped access and actions.')}
          </div>
        </div>
      </section>

      <section class="landing-section workflow-section" id="workflow">
        <div class="landing-container">
          <div class="section-head">
            <p class="landing-eyebrow">Workflow</p>
            <h2>Simple order process</h2>
          </div>

          <div class="process-grid">
            ${processCard('01', 'Create', 'Submit the order with service item, contact person, business unit, and request description.')}
            ${processCard('02', 'Assign & Work', 'HCAM assigns users. Team Solution moves the order through active work and uploads reports.')}
            ${processCard('03', 'Review & Complete', 'HCAM or Management reviews the work, exports evidence, and closes the order lifecycle.')}
          </div>
        </div>
      </section>

      <section class="landing-section" id="benefits">
        <div class="landing-container benefit-grid">
          <div>
            <p class="landing-eyebrow">Why HCSP-OM</p>
            <h2>Designed for faster, cleaner internal operations</h2>
            <p class="benefit-copy">Reduce scattered communication, manual tracking, unclear ownership, and missing report evidence.</p>
            <div class="benefit-list">
              ${benefit('Centralized order and report data')}
              ${benefit('Clear assignment and business unit ownership')}
              ${benefit('Status-based workflow with audit trail')}
              ${benefit('Secure admin-managed access')}
            </div>
          </div>

          <div class="impact-card">
            <h3>Platform Impact</h3>
            <div class="impact-grid">
              <div><strong>100%</strong><span>Centralized</span></div>
              <div><strong>7</strong><span>Statuses</span></div>
              <div><strong>5</strong><span>Roles</span></div>
              <div><strong>PDF/XLSX</strong><span>Exports</span></div>
            </div>
          </div>
        </div>
      </section>

      <section class="landing-cta" id="contact">
        <div class="landing-container cta-inner">
          <p class="landing-eyebrow">Get Started</p>
          <h2>Ready to streamline your order workflow?</h2>
          <p>Open HCSP-OM and manage Human Capital orders across business units more efficiently.</p>
          <button class="landing-btn landing-btn-primary landing-btn-lg" id="lpStart2">Open Dashboard</button>
        </div>
      </section>

      <footer class="landing-footer">
        <div class="landing-container footer-inner">
          <div>
            <strong>Telkom HCSP-OM</strong>
            <span>Order Management System</span>
          </div>
          <p>&copy; ${new Date().getFullYear()} PT Telekomunikasi Indonesia. All rights reserved.</p>
        </div>
      </footer>
    </main>
  `;

  document.querySelector('#lpLoginTop').addEventListener('click', onLogin);
  document.querySelector('#lpStart').addEventListener('click', onLogin);
  document.querySelector('#lpStart2').addEventListener('click', onLogin);
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
