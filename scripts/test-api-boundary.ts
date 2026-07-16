import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { createApiApp } from '../apps/api/src/app';

const app = createApiApp();
const server = app.listen(0, '127.0.0.1');

try {
  await new Promise<void>((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
  const address = server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${address.port}`;

  const healthResponse = await fetch(`${baseUrl}/api/v1/business-health`);
  const health = await healthResponse.json();
  assert.equal(healthResponse.status, 200);
  assert.equal(health.data.architecture, 'web-api-supabase');
  assert.equal(typeof health.requestId, 'string');

  const contentResponse = await fetch(`${baseUrl}/api/v1/species?limit=2`);
  const content = await contentResponse.json();
  assert.equal(contentResponse.status, health.data.databaseConfigured ? 200 : 503);
  if (!health.data.databaseConfigured) {
    assert.equal(content.error.code, 'DEPENDENCY_UNAVAILABLE');
  }

  const missingResponse = await fetch(`${baseUrl}/api/v1/not-a-route`);
  const missing = await missingResponse.json();
  assert.equal(missingResponse.status, 404);
  assert.equal(missing.error.code, 'NOT_FOUND');
  assert.equal(typeof missing.requestId, 'string');

  const protectedResponse = await fetch(`${baseUrl}/api/v1/aquariums`);
  const protectedPayload = await protectedResponse.json();
  assert.equal(protectedResponse.status, 401);
  assert.equal(protectedPayload.error.code, 'AUTH_REQUIRED');

  const legacyHealthResponse = await fetch(`${baseUrl}/api/health`);
  assert.equal(legacyHealthResponse.status, 200);

  console.log('API boundary verified: versioned health, auth guard, structured errors, content dependency fallback and legacy health');
} finally {
  if (server.listening) {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
}
