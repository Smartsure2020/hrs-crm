import { requireAuth } from './_auth.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = await requireAuth(req, res);
  if (!user) return;

  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'url required' });

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return res.redirect(url);
  }

  try {
    const { getDownloadUrl } = await import('@vercel/blob');
    const { url: signedUrl } = await getDownloadUrl(url);
    return res.redirect(signedUrl);
  } catch {
    // Fallback for legacy public blobs
    return res.redirect(url);
  }
}
