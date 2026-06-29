import { supabase } from '../supabase.js';
import { downloadAttachments, formatFileSize, openAttachment } from '../utils/report-files.js';
import { notify } from '../utils/notify.js';
import { normalizeRole } from '../main.js';

function escapeHtml(value) {
  return (value ?? '').toString().replace(/[&<>"']/g, ch => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[ch]));
}

function reportDateLabel(report) {
  const value = report.report_date || report.created_at;
  return value ? new Date(value).toLocaleDateString() : '-';
}

function orderTitle(report) {
  return report.orders?.order_title || `Order #${report.order_id}`;
}

export async function renderWorkReports(profile) {
  const view = document.querySelector('#appContent .view');
  if (!view) return;

  view.innerHTML = `
    <div class="page-head">
      <h1>Work Reports</h1>
      <p>Review submitted work reports and download their attachments.</p>
    </div>
    <div class="panel"><div class="empty">Loading work reports...</div></div>
  `;

  const reports = await loadReports(profile);
  drawReports(view, reports);
}

async function loadReports(profile) {
  const role = normalizeRole(profile?.role);
  const { data, error } = await supabase
    .from('work_reports')
    .select(`
      *,
      orders (id, order_title, status, created_by, business_units (name)),
      work_report_attachments (*)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    notify(error.message, 'error');
    return [];
  }

  let reports = data || [];
  if (role === 'customer' && profile?.id) {
    reports = reports.filter(r => r.orders?.created_by === profile.id);
  }
  return reports;
}

function drawReports(view, reports) {
  view.innerHTML = `
    <div class="page-head">
      <h1>Work Reports</h1>
      <p>${reports.length} report${reports.length === 1 ? '' : 's'} submitted.</p>
    </div>
    <div class="panel work-report-panel">
      ${reports.length ? reports.map(report => reportRow(report)).join('') : '<div class="empty">No work reports submitted yet.</div>'}
    </div>
  `;

  view.querySelectorAll('[data-report-detail]').forEach(btn => {
    btn.addEventListener('click', () => {
      const report = reports.find(r => `${r.id}` === btn.dataset.reportDetail);
      if (report) showReportDetail(report);
    });
  });

  view.querySelectorAll('[data-report-download]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const report = reports.find(r => `${r.id}` === btn.dataset.reportDownload);
      if (!report) return;
      try {
        await downloadAttachments(report.work_report_attachments || []);
      } catch (err) {
        notify(err.message, 'error');
      }
    });
  });
}

function reportRow(report) {
  const attachments = report.work_report_attachments || [];
  return `
    <div class="work-report-row">
      <div>
        <div class="row-main">${escapeHtml(report.report_title || 'Untitled report')}</div>
        <div class="row-sub">#ORD-${report.order_id} · ${escapeHtml(orderTitle(report))}</div>
        <div class="row-sub">${escapeHtml(report.orders?.business_units?.name || '-')} · ${reportDateLabel(report)}</div>
      </div>
      <div class="report-row-meta">
        <span class="pill pill-dim">${escapeHtml(report.orders?.status || 'Order')}</span>
        <span class="row-sub">${attachments.length} file(s)</span>
        <button class="btn btn-ghost" data-report-detail="${report.id}" style="padding:7px 10px">Lihat detail</button>
        <button class="btn btn-ghost" data-report-download="${report.id}" style="padding:7px 10px" ${attachments.length ? '' : 'disabled'}>Unduh semua</button>
      </div>
    </div>
  `;
}

function showReportDetail(report) {
  const attachments = report.work_report_attachments || [];
  const el = document.createElement('div');
  el.className = 'modal-backdrop';
  el.innerHTML = `
    <div class="modal-card report-modal" role="dialog" aria-modal="true">
      <div class="modal-head">
        <div>
          <h3>${escapeHtml(report.report_title || 'Work report')}</h3>
          <p>#ORD-${report.order_id} · ${reportDateLabel(report)}</p>
        </div>
        <button class="modal-x" type="button" data-modal-cancel aria-label="Close">&times;</button>
      </div>
      <div class="detail-label">Order</div>
      <div class="detail-text" style="margin-bottom:14px">${escapeHtml(orderTitle(report))}</div>
      <div class="detail-label">Notes</div>
      <div class="detail-text" style="margin-bottom:14px">${escapeHtml(report.notes || 'No notes provided.')}</div>
      <div class="detail-label">Attachments</div>
      ${attachments.length ? `
        <div style="display:flex;flex-direction:column;gap:8px;margin-top:8px">
          ${attachments.map(a => `
            <button class="attachment-row" type="button" data-open-attachment="${a.id}">
              <span>${escapeHtml(a.file_name)}</span>
              <small>${formatFileSize(a.file_size)}</small>
            </button>
          `).join('')}
        </div>` : '<div class="empty">No attachments uploaded.</div>'}
      <div class="modal-actions">
        <button class="btn btn-ghost" type="button" data-modal-cancel>Close</button>
        <button class="btn btn-primary" type="button" data-download-report ${attachments.length ? '' : 'disabled'}>Unduh semua</button>
      </div>
    </div>
  `;

  document.body.appendChild(el);
  const close = () => {
    el.classList.add('closing');
    setTimeout(() => el.remove(), 160);
  };
  el.querySelectorAll('[data-modal-cancel]').forEach(btn => btn.addEventListener('click', close));
  el.addEventListener('click', e => { if (e.target === el) close(); });
  el.querySelector('[data-download-report]')?.addEventListener('click', () => downloadAttachments(attachments));
  el.querySelectorAll('[data-open-attachment]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const attachment = attachments.find(a => `${a.id}` === btn.dataset.openAttachment);
      if (!attachment) return;
      try {
        await openAttachment(attachment.file_path);
      } catch (err) {
        notify(err.message, 'error');
      }
    });
  });
}
