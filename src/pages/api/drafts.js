function parseCookies(req) {
  const c = {};
  (req.headers.cookie || '').split(';').forEach(s => {
    const [k, ...v] = s.trim().split('=');
    if (k) c[k] = v.join('=');
  });
  return c;
}

async function refreshToken(rt) {
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      refresh_token: rt,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      grant_type: 'refresh_token',
    }),
  });
  return r.json();
}

async function getToken(req, res) {
  const cookies = parseCookies(req);
  let token = cookies.ffc_at;
  const exp = parseInt(cookies.ffc_exp || '0');
  const rt = cookies.ffc_rt;
  if (!token) return null;
  if (Date.now() > exp && rt) {
    try {
      const n = await refreshToken(rt);
      if (n.access_token) {
        token = n.access_token;
        const o = 'HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=31536000';
        res.setHeader('Set-Cookie', [
          `ffc_at=${token}; ${o}`,
          `ffc_exp=${Date.now() + n.expires_in * 1000}; ${o}`,
        ]);
      } else { return null; }
    } catch (e) { return null; }
  }
  return token;
}

function decodeBase64Url(str) {
  const padded = str + '='.repeat((4 - (str.length % 4)) % 4);
  const binary = Buffer.from(padded, 'base64').toString('utf-8');
  return binary;
}

function getHeaderValue(headers, name) {
  const header = headers.find(h => h.name.toLowerCase() === name.toLowerCase());
  return header?.value || '';
}

function extractBodyFromMessage(message) {
  let body = '';

  if (message.payload.parts) {
    const textPart = message.payload.parts.find(p => p.mimeType === 'text/plain');
    if (textPart && textPart.body?.data) {
      body = decodeBase64Url(textPart.body.data);
    } else {
      const htmlPart = message.payload.parts.find(p => p.mimeType === 'text/html');
      if (htmlPart && htmlPart.body?.data) {
        body = decodeBase64Url(htmlPart.body.data);
      }
    }
  } else if (message.payload.body?.data) {
    body = decodeBase64Url(message.payload.body.data);
  }

  return body;
}

async function fetchDraftDetails(token, messageId) {
  const response = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch draft details');
  }

  const message = await response.json();
  const headers = message.payload.headers || [];
  const body = extractBodyFromMessage(message);

  return {
    id: messageId,
    messageId: message.id,
    to: getHeaderValue(headers, 'To'),
    subject: getHeaderValue(headers, 'Subject'),
    snippet: message.snippet,
    date: getHeaderValue(headers, 'Date'),
    body,
  };
}

async function handleGet(token) {
  const response = await fetch(
    'https://gmail.googleapis.com/gmail/v1/users/me/drafts?maxResults=20',
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch drafts list');
  }

  const data = await response.json();
  const draftIds = data.drafts?.map(d => d.id) || [];

  const drafts = await Promise.all(
    draftIds.map(id => fetchDraftDetails(token, id))
  );

  return { drafts };
}

async function handleDelete(token, draftId) {
  const response = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/drafts/${draftId}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to delete draft');
  }

  return { success: true };
}

async function handleSend(token, draftId) {
  const response = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/drafts/${draftId}/send`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to send draft');
  }

  const data = await response.json();
  return { success: true, messageId: data.id };
}

export default async function handler(req, res) {
  const token = await getToken(req, res);
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    if (req.method === 'GET') {
      const result = await handleGet(token);
      return res.status(200).json(result);
    }

    if (req.method === 'DELETE') {
      const { id } = req.query;
      if (!id) {
        return res.status(400).json({ error: 'Missing draft ID' });
      }
      const result = await handleDelete(token, id);
      return res.status(200).json(result);
    }

    if (req.method === 'PUT') {
      const { draftId } = req.body;
      if (!draftId) {
        return res.status(400).json({ error: 'Missing draft ID' });
      }
      const result = await handleSend(token, draftId);
      return res.status(200).json(result);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Drafts API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
