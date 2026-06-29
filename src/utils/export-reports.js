import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import writeXlsxFile from 'write-excel-file/browser';

const HEADERS = [
  'Report ID',
  'Order ID',
  'Order Title',
  'Service',
  'Business Unit',
  'Order Status',
  'Report Title',
  'Report Date',
  'Attachments',
  'Notes',
];

function rowFor(report) {
  return [
    `#RPT-${report.id}`,
    `#ORD-${report.order_id}`,
    report.orders?.order_title || '',
    report.orders?.item_order || '',
    report.orders?.business_units?.name || '',
    report.orders?.status || '',
    report.report_title || '',
    report.report_date ? new Date(report.report_date).toLocaleDateString() : '',
    `${report.work_report_attachments?.length || 0}`,
    report.notes || '',
  ];
}

const stamp = () => new Date().toISOString().slice(0, 10);

function fileSafe(value) {
  return (value || 'work-report')
    .toString()
    .replace(/[^\w.\-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90) || 'work-report';
}

export async function exportReportsExcel(reports) {
  const schema = HEADERS.map((h, i) => ({
    column: h,
    type: String,
    value: report => rowFor(report)[i],
  }));
  await writeXlsxFile(reports, { schema, fileName: `hcsp-work-reports-${stamp()}.xlsx` });
}

export function exportReportsPdf(reports) {
  const doc = new jsPDF({ orientation: 'landscape' });
  doc.setFontSize(14);
  doc.text('HCSP-OM - Work Reports', 14, 16);
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(`Generated ${new Date().toLocaleString()} - ${reports.length} report(s)`, 14, 22);

  autoTable(doc, {
    head: [HEADERS],
    body: reports.map(rowFor),
    startY: 28,
    styles: { fontSize: 8, cellPadding: 2.3 },
    headStyles: { fillColor: [227, 30, 36], textColor: 255 },
    alternateRowStyles: { fillColor: [245, 246, 248] },
    columnStyles: {
      9: { cellWidth: 55 },
    },
  });

  doc.save(`hcsp-work-reports-${stamp()}.pdf`);
}

export function exportSingleReportPdf(report) {
  const attachments = report.work_report_attachments || [];
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 16;
  let y = 18;

  doc.setTextColor(227, 30, 36);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('HCSP-OM WORK REPORT', margin, y);

  y += 10;
  doc.setTextColor(17, 24, 39);
  doc.setFontSize(18);
  doc.text(report.report_title || 'Work report', margin, y, { maxWidth: pageWidth - margin * 2 });

  y += 10;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Generated ${new Date().toLocaleString()}`, margin, y);

  y += 10;
  autoTable(doc, {
    startY: y,
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: 1.8, textColor: [17, 24, 39] },
    columnStyles: {
      0: { cellWidth: 36, fontStyle: 'bold', textColor: [71, 85, 105] },
      1: { cellWidth: pageWidth - margin * 2 - 36 },
    },
    body: [
      ['Report ID', `#RPT-${report.id}`],
      ['Order ID', `#ORD-${report.order_id}`],
      ['Order Title', report.orders?.order_title || '-'],
      ['Service', report.orders?.item_order || '-'],
      ['Business Unit', report.orders?.business_units?.name || '-'],
      ['Order Status', report.orders?.status || '-'],
      ['Report Date', report.report_date ? new Date(report.report_date).toLocaleDateString() : '-'],
    ],
  });

  y = doc.lastAutoTable.finalY + 9;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(17, 24, 39);
  doc.text('Notes', margin, y);

  y += 6;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const noteLines = doc.splitTextToSize(report.notes || 'No notes provided.', pageWidth - margin * 2);
  doc.text(noteLines, margin, y);

  y += noteLines.length * 5 + 8;
  autoTable(doc, {
    startY: y,
    head: [['Attachment Name', 'Size', 'Type']],
    body: attachments.length
      ? attachments.map(a => [a.file_name || '-', a.file_size ? `${(a.file_size / 1024).toFixed(1)} KB` : '-', a.file_type || '-'])
      : [['No attachments uploaded', '-', '-']],
    styles: { fontSize: 9, cellPadding: 2.5 },
    headStyles: { fillColor: [227, 30, 36], textColor: 255 },
    alternateRowStyles: { fillColor: [245, 246, 248] },
  });

  doc.save(`hcsp-work-report-${report.id}-${fileSafe(report.report_title)}-${stamp()}.pdf`);
}
