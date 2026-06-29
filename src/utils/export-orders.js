import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import writeXlsxFile from 'write-excel-file/browser';

const HEADERS = ['Order ID', 'Title', 'Service', 'Business Unit', 'Status', 'Contact', 'Created'];

function rowFor(o) {
  return [
    `#ORD-${o.id}`,
    o.order_title || '',
    o.item_order || '',
    o.business_units?.name || o.business_unit_other || '',
    o.status || '',
    o.contact_number || '',
    o.created_at ? new Date(o.created_at).toLocaleDateString() : '',
  ];
}

const stamp = () => new Date().toISOString().slice(0, 10);

// --- Excel (.xlsx) ---
export async function exportOrdersExcel(orders) {
  const schema = HEADERS.map((h, i) => ({
    column: h,
    type: String,
    value: (o) => rowFor(o)[i],
  }));
  await writeXlsxFile(orders, { schema, fileName: `hcsp-orders-${stamp()}.xlsx` });
}

// --- PDF ---
export function exportOrdersPdf(orders) {
  const doc = new jsPDF({ orientation: 'landscape' });
  doc.setFontSize(14);
  doc.text('HCSP-OM — Orders Report', 14, 16);
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(`Generated ${new Date().toLocaleString()} · ${orders.length} order(s)`, 14, 22);

  autoTable(doc, {
    head: [HEADERS],
    body: orders.map(rowFor),
    startY: 28,
    styles: { fontSize: 8, cellPadding: 2.5 },
    headStyles: { fillColor: [227, 30, 36], textColor: 255 }, // Telkom red
    alternateRowStyles: { fillColor: [245, 246, 248] },
  });

  doc.save(`hcsp-orders-${stamp()}.pdf`);
}
