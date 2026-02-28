'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const app = require('./server.js');

let server;
let port;

// Start a temporary server before tests
test.before(async () => {
  await new Promise(resolve => {
    server = http.createServer(app);
    server.listen(0, () => { port = server.address().port; resolve(); });
  });
});

test.after(() => server.close());

async function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const opts = { hostname: 'localhost', port, path, method, headers: { 'Content-Type': 'application/json' } };
    const req = http.request(opts, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, body: data ? JSON.parse(data) : null }));
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

test('GET /api/staff returns initial staff list', async () => {
  const { status, body } = await request('GET', '/api/staff');
  assert.equal(status, 200);
  assert.ok(Array.isArray(body));
  assert.ok(body.length >= 3);
});

test('POST /api/staff creates a new staff member', async () => {
  const { status, body } = await request('POST', '/api/staff', {
    name: 'Test User', role: 'Tester', department: 'QA', email: 'test@example.com'
  });
  assert.equal(status, 201);
  assert.equal(body.name, 'Test User');
  assert.ok(body.id);
});

test('POST /api/staff returns 400 when fields are missing', async () => {
  const { status } = await request('POST', '/api/staff', { name: 'No Role' });
  assert.equal(status, 400);
});

test('GET /api/staff/:id returns a single staff member', async () => {
  const { status, body } = await request('GET', '/api/staff/1');
  assert.equal(status, 200);
  assert.equal(body.id, 1);
});

test('GET /api/staff/:id returns 404 for unknown id', async () => {
  const { status } = await request('GET', '/api/staff/9999');
  assert.equal(status, 404);
});

test('PUT /api/staff/:id updates a staff member', async () => {
  const { status, body } = await request('PUT', '/api/staff/2', { role: 'Senior Developer' });
  assert.equal(status, 200);
  assert.equal(body.role, 'Senior Developer');
});

test('PUT /api/staff/:id returns 404 for unknown id', async () => {
  const { status } = await request('PUT', '/api/staff/9999', { role: 'Ghost' });
  assert.equal(status, 404);
});

test('DELETE /api/staff/:id removes a staff member', async () => {
  const { status } = await request('DELETE', '/api/staff/3');
  assert.equal(status, 204);
  const { status: getStatus } = await request('GET', '/api/staff/3');
  assert.equal(getStatus, 404);
});
