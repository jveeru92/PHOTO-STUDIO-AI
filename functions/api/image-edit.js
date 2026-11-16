/**
 * Image-to-image editing. Cloudflare Workers AI Flux 2 Klein (free tier) does
 * not support image-to-image editing, so we do not fake it. Manual editing
 * (CanvasEditor) handles adjustments; conversational editing via a supported
 * image-editing provider can be added later through the adapter interface.
 */

module.exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify({
      ok: true,
      message: 'Image-to-image editing is handled manually in the editor (CanvasEditor). Remote image-to-image not available on the free tier without a supported provider.',
      edited: false,
    }),
  };
};
