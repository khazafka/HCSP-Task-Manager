import { supabase } from '../supabase.js';
import { deleteAttachmentFiles, downloadAttachments, formatFileSize, openAttachment } from '../utils/report-files.js';
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

function canExportReports(role) {
  return ['admin', 'hcam', 'management'].includes(role);
}

function canDeleteReports(role) {
  return role === 'admin';
}

const reportFilters = { search: '', status: '', unit: '', dateFrom: '', dateTo: '' };

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
  drawReports(view, reports, profile);
}

async function loadReports(profile) {
  const role = normalizeRole(profile?.role);
  const { data, error } = await supabase
    .from('work_reports')
    .select(`
      *,
      orders (
        id,
        order_title,
        item_order,
        status,
        created_by,
        business_units (name),
        order_assignments (user_id)
      ),
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
  } else if (role === 'team' && profile?.id) {
    reports = reports.filter(r => (r.orders?.order_assignments || []).some(a => a.user_id === profile.id));
  }
  return reports;
}

function drawReports(view, reports, profile, focusId = '') {
  const role = normalizeRole(profile?.role);
  const visibleReports = applyReportFilters(reports);
  const statuses = [...new Set(reports.map(r => r.orders?.status).filter(Boolean))];
  const units = [...new Set(reports.map(r => r.orders?.business_units?.name).filter(Boolean))];
  view.innerHTML = `
    <div class="toolbar">
      <div class="page-head" style="margin:0">
        <h1>Work Reports</h1>
        <p>${visibleReports.length} of ${reports.length} report${reports.length === 1 ? '' : 's'} shown.</p>
      </div>
      ${canExportReports(role) ? `
        <div class="toolbar-tools">
          <button class="tool-btn" id="exportReportsExcel">Excel (.xlsx)</button>
        </div>` : ''}
    </div>
    <div class="page-controls page-controls-grid">
      <input id="reportSearch" class="page-search" type="search" placeholder="Search reports by title, order, notes, service, or unit..." value="${escapeHtml(reportFilters.search)}"/>
      <select id="reportStatusFilter" class="select compact-select">
        <option value="">All statuses</option>
        ${statuses.map(status => `<option value="${escapeHtml(status)}" ${reportFilters.status === status ? 'selected' : ''}>${escapeHtml(status)}</option>`).join('')}
      </select>
      <select id="reportUnitFilter" class="select compact-select">
        <option value="">All units</option>
        ${units.map(unit => `<option value="${escapeHtml(unit)}" ${reportFilters.unit === unit ? 'selected' : ''}>${escapeHtml(unit)}</option>`).join('')}
      </select>
      <input id="reportDateFrom" class="input compact-input" type="date" value="${escapeHtml(reportFilters.dateFrom)}" aria-label="Report date from"/>
      <input id="reportDateTo" class="input compact-input" type="date" value="${escapeHtml(reportFilters.dateTo)}" aria-label="Report date to"/>
      <button id="clearReportFilters" class="btn btn-ghost compact-btn">Clear</button>
    </div>
    <div class="panel work-report-panel">
      ${visibleReports.length ? visibleReports.map(report => reportRow(report, role)).join('') : '<div class="empty">No work reports matched your search or filters.</div>'}
    </div>
  `;

  view.querySelector('#exportReportsExcel')?.addEventListener('click', async () => {
    if (!visibleReports.length) { notify('No work reports to export.', 'warning'); return; }
    const exp = await import('../utils/export-reports.js');
    await exp.exportReportsExcel(visibleReports);
    notify(`Exported ${visibleReports.length} work report(s).`, 'success');
  });

  const redraw = () => drawReports(view, reports, profile);
  const searchEl = view.querySelector('#reportSearch');
  searchEl?.addEventListener('input', () => {
    reportFilters.search = searchEl.value;
    drawReports(view, reports, profile, 'reportSearch');
  });
  view.querySelector('#reportStatusFilter')?.addEventListener('change', e => {
    reportFilters.status = e.target.value;
    redraw();
  });
  view.querySelector('#reportUnitFilter')?.addEventListener('change', e => {
    reportFilters.unit = e.target.value;
    redraw();
  });
  view.querySelector('#reportDateFrom')?.addEventListener('change', e => {
    reportFilters.dateFrom = e.target.value;
    redraw();
  });
  view.querySelector('#reportDateTo')?.addEventListener('change', e => {
    reportFilters.dateTo = e.target.value;
    redraw();
  });
  view.querySelector('#clearReportFilters')?.addEventListener('click', () => {
    reportFilters.search = '';
    reportFilters.status = '';
    reportFilters.unit = '';
    reportFilters.dateFrom = '';
    reportFilters.dateTo = '';
    redraw();
  });

  if (focusId) {
    const focusEl = view.querySelector(`#${focusId}`);
    focusEl?.focus();
    if (focusEl?.setSelectionRange) {
      const end = focusEl.value.length;
      focusEl.setSelectionRange(end, end);
    }
  }

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
        await downloadAttachments(report.work_report_attachments || [], { zipName: `work-report-${report.id}-attachments` });
      } catch (err) {
        notify(err.message, 'error');
      }
    });
  });

  view.querySelectorAll('[data-report-delete]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const report = reports.find(r => `${r.id}` === btn.dataset.reportDelete);
      if (!report || !confirm(`Delete report "${report.report_title || report.id}"?`)) return;
      try {
        await deleteAttachmentFiles(report.work_report_attachments || []);
      } catch (err) {
        notify(`Report deleted from database, but storage cleanup may fail: ${err.message}`, 'warning');
      }
      const { error } = await supabase.from('work_reports').delete().eq('id', report.id);
      if (error) { notify(error.message, 'error'); return; }
      notify('Work report deleted.', 'success');
      drawReports(view, reports.filter(r => r.id !== report.id), profile);
    });
  });
}

function applyReportFilters(reports) {
  let out = [...reports];
  const q = reportFilters.search.trim().toLowerCase();
  if (q) {
    out = out.filter(report => [
      `rpt-${report.id}`,
      `#rpt-${report.id}`,
      `ord-${report.order_id}`,
      `#ord-${report.order_id}`,
      report.report_title,
      report.notes,
      orderTitle(report),
      report.orders?.item_order,
      report.orders?.status,
      report.orders?.business_units?.name,
    ].some(value => (value || '').toString().toLowerCase().includes(q)));
  }
  if (reportFilters.status) out = out.filter(r => r.orders?.status === reportFilters.status);
  if (reportFilters.unit) out = out.filter(r => r.orders?.business_units?.name === reportFilters.unit);
  if (reportFilters.dateFrom) {
    out = out.filter(r => {
      const value = (r.report_date || r.created_at || '').slice(0, 10);
      return value && value >= reportFilters.dateFrom;
    });
  }
  if (reportFilters.dateTo) {
    out = out.filter(r => {
      const value = (r.report_date || r.created_at || '').slice(0, 10);
      return value && value <= reportFilters.dateTo;
    });
  }
  return out;
}

function reportRow(report, role) {
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
        ${canDeleteReports(role) ? `<button class="btn btn-ghost" data-report-delete="${report.id}" style="padding:7px 10px;color:var(--danger);border-color:rgba(255,107,107,.3)">Delete</button>` : ''}
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
        <button class="btn btn-ghost" type="button" data-export-report-pdf>Export PDF</button>
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
  el.querySelector('[data-export-report-pdf]')?.addEventListener('click', async () => {
    const exp = await import('../utils/export-reports.js');
    exp.exportSingleReportPdf(report);
  });
  el.querySelector('[data-download-report]')?.addEventListener('click', async () => {
    try {
      await downloadAttachments(attachments, { zipName: `work-report-${report.id}-attachments` });
    } catch (err) {
      notify(err.message, 'error');
    }
  });
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
