import { t } from './i18n.js';

function escapeHtml(value) {
  return (value ?? '').toString().replace(/[&<>"']/g, ch => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[ch]));
}

export function confirmDialog({
  title,
  message,
  confirmText = t('common.confirm'),
  cancelText = t('common.cancel'),
  tone = 'primary',
} = {}) {
  return new Promise(resolve => {
    const el = document.createElement('div');
    el.className = 'modal-backdrop';
    el.innerHTML = `
      <div class="modal-card confirm-modal" role="dialog" aria-modal="true">
        <div class="modal-head">
          <div>
            <h3>${escapeHtml(title || t('common.confirmAction'))}</h3>
            <p>${escapeHtml(message || '')}</p>
          </div>
          <button class="modal-x" type="button" data-confirm-cancel aria-label="${escapeHtml(cancelText)}">&times;</button>
        </div>
        <div class="confirm-note">${escapeHtml(t('common.confirmHint'))}</div>
        <div class="modal-actions">
          <button class="btn btn-ghost" type="button" data-confirm-cancel>${escapeHtml(cancelText)}</button>
          <button class="btn ${tone === 'danger' ? 'btn-danger' : 'btn-primary'}" type="button" data-confirm-ok>${escapeHtml(confirmText)}</button>
        </div>
      </div>
    `;

    let settled = false;
    const finish = value => {
      if (settled) return;
      settled = true;
      document.removeEventListener('keydown', onKeyDown);
      el.classList.add('closing');
      setTimeout(() => el.remove(), 160);
      resolve(value);
    };
    const onKeyDown = event => {
      if (event.key === 'Escape') finish(false);
    };

    document.body.appendChild(el);
    document.addEventListener('keydown', onKeyDown);
    el.addEventListener('click', event => {
      if (event.target === el) finish(false);
    });
    el.querySelectorAll('[data-confirm-cancel]').forEach(btn => btn.addEventListener('click', () => finish(false)));
    el.querySelector('[data-confirm-ok]')?.addEventListener('click', () => finish(true));
    el.querySelector('[data-confirm-ok]')?.focus();
  });
}
