const { conversations } = require('../chat');

function cors() {
  return { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };
}

module.exports.handler = async (event) => {
  const { httpMethod } = event;
  const url = new URL(event.rawUrl || `http://localhost${event.path}`, 'http://localhost');
  const id = url.searchParams.get('id');

  if (httpMethod === 'GET') {
    if (id) {
      const c = conversations.get(id);
      if (!c) return { statusCode: 404, headers: cors(), body: JSON.stringify({ error: 'Not found' }) };
      return { statusCode: 200, headers: cors(), body: JSON.stringify(c) };
    }
    return { statusCode: 200, headers: cors(), body: JSON.stringify(Array.from(conversations.values()).map((c) => ({ id: c.id, title: c.title, createdAt: c.createdAt, updatedAt: c.updatedAt }))) };
  }
  if (httpMethod === 'POST') {
    let payload;
    try { payload = JSON.parse(event.body || '{}'); } catch { return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) }; }
    const { action } = payload;
    if (action === 'create') {
      const cid = payload.id || 'conv-' + Date.now();
      const c = { id: cid, title: payload.title || 'New conversation', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), messages: [] };
      conversations.set(cid, c);
      return { statusCode: 200, headers: cors(), body: JSON.stringify(c) };
    }
    if (action === 'get') {
      const c = conversations.get(payload.id);
      if (!c) return { statusCode: 404, headers: cors(), body: JSON.stringify({ error: 'Not found' }) };
      return { statusCode: 200, headers: cors(), body: JSON.stringify(c) };
    }
    if (action === 'rename') {
      const c = conversations.get(payload.id);
      if (!c) return { statusCode: 404, headers: cors(), body: JSON.stringify({ error: 'Not found' }) };
      c.title = payload.title;
      c.updatedAt = new Date().toISOString();
      return { statusCode: 200, headers: cors(), body: JSON.stringify(c) };
    }
    if (action === 'delete') {
      conversations.delete(payload.id);
      return { statusCode: 200, headers: cors(), body: JSON.stringify({ ok: true }) };
    }
    const cid = payload.id || 'conv-' + Date.now();
    const c = { id: cid, title: payload.title || 'New conversation', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), messages: [] };
    conversations.set(cid, c);
    return { statusCode: 200, headers: cors(), body: JSON.stringify(c) };
  }
  return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
};
