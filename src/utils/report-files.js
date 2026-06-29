import { supabase } from '../supabase.js';

export const REPORT_BUCKET = 'work-report-attachments';
export const MAX_REPORT_FILE_SIZE = 10 * 1024 * 1024;

export function sanitizeFileName(name) {
  return (name || 'file')
    .replace(/[^\w.\-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 120) || 'file';
}

export function formatFileSize(bytes = 0) {
  if (!bytes) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function validateReportFiles(files) {
  const invalid = files.find(file => file.size > MAX_REPORT_FILE_SIZE);
  if (invalid) {
    throw new Error(`${invalid.name} is larger than 10 MB.`);
  }
}

export async function uploadReportFiles({ files, orderId, reportId, userId }) {
  validateReportFiles(files);
  const rows = [];

  for (const file of files) {
    const safeName = sanitizeFileName(file.name);
    const path = `order-${orderId}/report-${reportId}/${Date.now()}-${safeName}`;
    const { error } = await supabase.storage
      .from(REPORT_BUCKET)
      .upload(path, file, { upsert: false, contentType: file.type || undefined });

    if (error) throw new Error(`Upload failed for ${file.name}: ${error.message}`);

    rows.push({
      work_report_id: reportId,
      order_id: orderId,
      file_name: file.name,
      file_path: path,
      file_size: file.size,
      file_type: file.type || '',
      uploaded_by: userId,
    });
  }

  return rows;
}

export async function openAttachment(path) {
  const { data, error } = await supabase.storage
    .from(REPORT_BUCKET)
    .createSignedUrl(path, 60);
  if (error) throw new Error(error.message);
  window.open(data.signedUrl, '_blank', 'noopener');
}

export async function downloadAttachments(attachments = []) {
  for (const attachment of attachments) {
    await openAttachment(attachment.file_path);
  }
}

export async function deleteAttachmentFiles(attachments = []) {
  const paths = attachments.map(a => a.file_path).filter(Boolean);
  if (!paths.length) return;
  const { error } = await supabase.storage.from(REPORT_BUCKET).remove(paths);
  if (error) throw new Error(error.message);
}
