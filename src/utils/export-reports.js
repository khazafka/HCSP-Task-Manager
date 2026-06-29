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
