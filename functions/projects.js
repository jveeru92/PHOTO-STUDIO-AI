/**
 * Projects CRUD. In-memory per container (durable storage needs a configured DB).
 * Frontend mirrors to IndexedDB via storage.js.
 * Supports: GET (list or ?id=X), POST with action (create|get|update|delete).
 */

const projects = new Map();

function cors() {
  return { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };
}

module.exports.handler = async (event) => {
  const { httpMethod } = event;
  const url = new URL(event.rawUrl || `http://localhost${event.path}`, 'http://localhost');
  const id = url.searchParams.get('id');

  if (httpMethod === 'GET') {
    if (id) {
      const p = projects.get(id);
      if (!p) return { statusCode: 404, headers: cors(), body: JSON.stringify({ error: 'Not found' }) };
      return { statusCode: 200, headers: cors(), body: JSON.stringify(p) };
    }
    return { statusCode: 200, headers: cors(), body: JSON.stringify(Array.from(projects.values())) };
  }
  if (httpMethod === 'POST') {
    let payload;
    try { payload = JSON.parse(event.body || '{}'); } catch { return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) }; }
    const { action } = payload;
    if (action === 'create') {
      const pid = payload.id || 'proj-' + Date.now();
      const project = { ...payload, id: pid, createdAt: payload.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString() };
      projects.set(pid, project);
      return { statusCode: 200, headers: cors(), body: JSON.stringify(project) };
    }
    if (action === 'get') {
      const p = projects.get(payload.id);
      if (!p) return { statusCode: 404, headers: cors(), body: JSON.stringify({ error: 'Not found' }) };
      return { statusCode: 200, headers: cors(), body: JSON.stringify(p) };
    }
    if (action === 'update') {
      const p = projects.get(payload.id);
      if (!p) return { statusCode: 404, headers: cors(), body: JSON.stringify({ error: 'Not found' }) };
      const updated = { ...p, ...payload.payload, id: payload.id, updatedAt: new Date().toISOString() };
      projects.set(payload.id, updated);
      return { statusCode: 200, headers: cors(), body: JSON.stringify(updated) };
    }
    if (action === 'delete') {
      projects.delete(payload.id);
      return { statusCode: 200, headers: cors(), body: JSON.stringify({ ok: true }) };
    }
    // default: create
    const pid = payload.id || 'proj-' + Date.now();
    const project = { ...payload, id: pid, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    projects.set(pid, project);
    return { statusCode: 200, headers: cors(), body: JSON.stringify(project) };
  }
  return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
};
