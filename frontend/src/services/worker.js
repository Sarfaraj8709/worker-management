import axios from 'axios';

/**
 * Worker-facing service layer (axios baseURL is configured in AuthContext).
 *
 * Backend endpoints (backend/routes/worker.js):
 *   GET    /worker/verification
 *   POST   /worker/verification/documents/:docType  (multipart, field "file")
 *   DELETE /worker/verification/documents/:docType
 */

const API_ORIGIN = 'http://localhost:5000';

/** Convert a stored server path (e.g. `/uploads/doc-123.png`) into a usable URL. */
export const assetUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${API_ORIGIN}${path}`;
};

export const getMyVerification = async () => {
  const res = await axios.get('/worker/verification');
  if (!res.data.success) throw new Error(res.data.message || 'Failed to load verification');
  return res.data.verification;
};

export const uploadVerificationDocument = async (docType, file) => {
  const form = new FormData();
  form.append('file', file);
  const res = await axios.post(`/worker/verification/documents/${docType}`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  if (!res.data.success) throw new Error(res.data.message || 'Upload failed');
  return res.data.verification;
};

export const removeVerificationDocument = async (docType) => {
  const res = await axios.delete(`/worker/verification/documents/${docType}`);
  if (!res.data.success) throw new Error(res.data.message || 'Remove failed');
  return res.data.verification;
};
