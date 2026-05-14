import { requireAuth } from './_auth.js';

// File upload handler
// Dev: returns a placeholder URL when BLOB_READ_WRITE_TOKEN is absent
// Prod: streams the raw request body to Vercel Blob storage
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = await requireAuth(req, res);
  if (!user) return;

  const rawName = req.query?.filename || `upload-${Date.now()}`;
  const filename = rawName.replace(/[^a-zA-Z0-9._-]/g, '_');

  // Dev stub — no Blob token present
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return res.status(200).json({
      file_url: `https://placeholder.blob.vercel-storage.com/${filename}`,
    });
  }

  try {
    const { put } = await import('@vercel/blob');
    const blob = await put(filename, req, { access: 'private' });
    return res.status(200).json({ file_url: blob.url });
  } catch (err) {
    console.error('upload-file error:', err);
    return res.status(500).json({ error: err.message });
  }
}
