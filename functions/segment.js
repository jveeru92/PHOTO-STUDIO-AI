/**
 * Background segmentation endpoint. Remote segmentation is optional; the
 * editor performs chroma-based removal client-side (honest fallback). This
 * endpoint accepts an image + background color and acknowledges; a real
 * remote segmentation adapter can be plugged in here.
 */

module.exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify({
      ok: true,
      message: 'Background processing performed client-side (chroma mask + edge feather). No remote AI segmentation configured.',
      processed: false,
    }),
  };
};
