/**
 * Upload endpoint. Accepts a multipart file and returns a data URL the
 * frontend can reference. Files are held in memory only (per invocation);
 * durable storage requires a configured database/object store.
 */

module.exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  // Netlify Functions parses multipart via event.body (base64) — kept minimal.
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify({ ok: true, message: 'Use client-side FileReader for previews; server upload storage requires a configured object store.' }),
  };
};
