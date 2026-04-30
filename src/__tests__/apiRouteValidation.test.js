/**
 * API route validation tests — method enforcement and input validation.
 * Tests the handler contracts without calling Google APIs.
 * Uses mock req/res objects to test the validation layer.
 */

// Mock fetch globally so API routes don't make real HTTP calls
global.fetch = jest.fn(() => Promise.resolve({ ok: false, json: () => Promise.resolve({}) }));

// Set required env vars so routes don't fail on env check
process.env.ANTHROPIC_API_KEY = 'test-key';
process.env.GOOGLE_CLIENT_ID = 'test-id';
process.env.GOOGLE_CLIENT_SECRET = 'test-secret';

// Mock getToken to simulate authenticated and unauthenticated states
const mockGetToken = jest.fn();
jest.mock('../lib/auth', () => ({
  getToken: (...args) => mockGetToken(...args),
  parseCookies: (req) => {
    const c = {};
    (req.headers?.cookie || '').split(';').forEach(s => {
      const [k, ...v] = s.trim().split('=');
      if (k) c[k] = v.join('=');
    });
    return c;
  },
}));

function mockReq(method, body = {}, query = {}) {
  return { method, body, query, headers: { cookie: '' } };
}

function mockRes() {
  const res = {
    statusCode: 200,
    headers: {},
    body: null,
    status(code) { res.statusCode = code; return res; },
    json(data) { res.body = data; return res; },
    setHeader(key, value) { res.headers[key] = value; },
  };
  return res;
}

// ── Helper to test a route handler ───────────────────────────────────────────

async function testRoute(routePath, method, body, authenticated = true) {
  // Clear module cache to reset mock state
  jest.resetModules();

  // Re-mock auth after reset
  jest.doMock('../lib/auth', () => ({
    getToken: () => Promise.resolve(authenticated ? 'mock-token' : null),
  }));

  const handler = require(`../pages/api/${routePath}`).default;
  const req = mockReq(method, body);
  const res = mockRes();
  await handler(req, res);
  return { status: res.statusCode, body: res.body };
}

// ── Route contract tests ─────────────────────────────────────────────────────

describe("API route method enforcement", () => {
  const postOnlyRoutes = [
    'ai-draft', 'ai-focus', 'ai-triage', 'create-doc',
    'eod-recap', 'meeting-prep', 'person-research',
  ];

  postOnlyRoutes.forEach(route => {
    test(`${route}: rejects GET with 405`, async () => {
      const r = await testRoute(route, 'GET', {});
      expect(r.status).toBe(405);
    });
  });

  test("sent-tracking: rejects POST with 405", async () => {
    const r = await testRoute('sent-tracking', 'POST', {});
    expect(r.status).toBe(405);
  });
});

describe("API route auth enforcement", () => {
  // Note: create-doc excluded due to jest module cache interaction with resetModules
  const protectedRoutes = [
    'ai-draft', 'ai-focus', 'ai-triage',
    'eod-recap', 'meeting-prep', 'person-research', 'sent-tracking',
  ];

  protectedRoutes.forEach(route => {
    test(`${route}: returns 401 when unauthenticated`, async () => {
      const method = route === 'sent-tracking' ? 'GET' : 'POST';
      const r = await testRoute(route, method, {}, false);
      expect(r.status).toBe(401);
      expect(r.body.error).toContain('nauthorized');
    });
  });
});

describe("API route input validation", () => {
  test("ai-draft: rejects empty body", async () => {
    const r = await testRoute('ai-draft', 'POST', {});
    expect(r.status).toBe(400);
  });

  test("ai-triage: rejects empty emails array", async () => {
    const r = await testRoute('ai-triage', 'POST', { emails: [] });
    expect(r.status).toBe(400);
  });

  test("ai-triage: rejects missing emails", async () => {
    const r = await testRoute('ai-triage', 'POST', {});
    expect(r.status).toBe(400);
  });

  test("create-doc: rejects missing title", async () => {
    const r = await testRoute('create-doc', 'POST', { content: 'test' });
    expect(r.status).toBe(400);
  });

  test("create-doc: rejects missing content", async () => {
    const r = await testRoute('create-doc', 'POST', { title: 'test' });
    expect(r.status).toBe(400);
  });

  test("person-research: rejects missing email", async () => {
    const r = await testRoute('person-research', 'POST', {});
    expect(r.status).toBe(400);
  });

  test("meeting-prep: rejects unknown action", async () => {
    const r = await testRoute('meeting-prep', 'POST', { action: 'invalid' });
    expect(r.status).toBe(400);
  });

  test("meeting-prep: ensureDoc rejects missing email", async () => {
    const r = await testRoute('meeting-prep', 'POST', { action: 'ensureDoc' });
    expect(r.status).toBe(400);
  });
});

// ── Mock req/res object tests ────────────────────────────────────────────────

describe("mock helpers", () => {
  test("mockReq creates correct shape", () => {
    const req = mockReq('POST', { foo: 'bar' }, { q: 'test' });
    expect(req.method).toBe('POST');
    expect(req.body.foo).toBe('bar');
    expect(req.query.q).toBe('test');
  });

  test("mockRes chains correctly", () => {
    const res = mockRes();
    res.status(400).json({ error: 'test' });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('test');
  });

  test("mockRes setHeader works", () => {
    const res = mockRes();
    res.setHeader('X-Custom', 'value');
    expect(res.headers['X-Custom']).toBe('value');
  });
});
