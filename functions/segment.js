/**
 * Background segmentation endpoint.
 *
 * Background removal/replacement is performed entirely client-side in the
 * browser using deterministic image processing (border flood-fill
 * segmentation). No remote AI segmentation API is configured or required.
 *
 * This endpoint exists for API compatibility and returns a placeholder
 * response. All segmentation logic lives in the frontend
 * (frontend/src/utils/image.ts: floodFillBackgroundMask, autoSegmentImageData)
 * and is applied in frontend/src/hooks/useBackgroundEditor.ts and
 * frontend/src/hooks/usePassportStudio.ts.
 */

module.exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify({
      ok: true,
      message: 'Background segmentation is performed client-side using deterministic border flood-fill segmentation. No remote AI segmentation API is configured or required.',
      processed: false,
      clientSide: true,
      method: 'border-flood-fill chroma segmentation',
    }),
  };
};
