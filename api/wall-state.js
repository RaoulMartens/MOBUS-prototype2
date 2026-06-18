const sessions = globalThis.__mobusWallSessions || new Map();
globalThis.__mobusWallSessions = sessions;

function getSessionId(req) {
  const url = new URL(req.url, `https://${req.headers.host || 'localhost'}`);
  return url.searchParams.get('session') || 'mobus-live';
}

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.end(JSON.stringify(payload));
}

module.exports = async function handler(req, res) {
  const sessionId = getSessionId(req);

  if (req.method === 'GET') {
    sendJson(res, 200, sessions.get(sessionId) || {
      event: { type: 'reset' },
      updatedAt: 0,
      version: 0
    });
    return;
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    sendJson(res, 405, { error: 'Method not allowed' });
    return;
  }

  let body = '';
  for await (const chunk of req) {
    body += chunk;
    if (body.length > 80_000) {
      sendJson(res, 413, { error: 'Payload too large' });
      return;
    }
  }

  let event;
  try {
    event = JSON.parse(body || '{}');
  } catch {
    sendJson(res, 400, { error: 'Invalid JSON' });
    return;
  }

  if (!event || typeof event.type !== 'string') {
    sendJson(res, 400, { error: 'Missing event type' });
    return;
  }

  const previous = sessions.get(sessionId);
  const next = {
    event,
    updatedAt: Date.now(),
    version: (previous?.version || 0) + 1
  };
  sessions.set(sessionId, next);
  sendJson(res, 200, next);
};
