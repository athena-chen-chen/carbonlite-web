import fs from 'node:fs';
import { expect, test } from '@playwright/test';

test('pilot RC: uploaded source bytes require authentication and tenant ownership', async ({ request }) => {
  test.skip(!process.env.TASK9_RC_STATE_FILE, 'Requires isolated Task 9 development workspaces.');
  const base = process.env.E2E_API_BASE_URL ?? 'http://localhost:3333/api';
  expect(['localhost', '127.0.0.1']).toContain(new URL(base).hostname);
  const state = JSON.parse(fs.readFileSync(process.env.TASK9_RC_STATE_FILE!, 'utf8'));
  const login = async (key: string) => {
    const response = await request.post(`${base}/auth/login`, {
      data: { email: state.accounts[key].email, password: state.password },
    });
    expect(response.status()).toBe(201);
    const data = await response.json();
    return { Authorization: `Bearer ${data.accessToken ?? data.token}` };
  };
  const owner = await login('A');
  const other = await login('B');
  const content = `Synthetic Task 9 private source ${Date.now()}\n`;
  const upload = await request.post(`${base}/documents/upload`, {
    headers: owner,
    multipart: { type: 'OTHER', file: { name: 'rc-private-source.csv', mimeType: 'text/csv', buffer: Buffer.from(content) } },
  });
  expect(upload.status()).toBe(201);
  const document = await upload.json();
  expect(document.fileUrl).toMatch(/^\/uploads\//);

  const direct = await request.get(new URL(document.fileUrl, base).href);
  expect([401, 403, 404]).toContain(direct.status());
  expect(await direct.text()).not.toContain(content.trim());
  expect((await request.get(`${base}/documents/${document.id}/download`)).status()).toBe(401);
  expect([403, 404]).toContain((await request.get(`${base}/documents/${document.id}/download`, { headers: other })).status());
  const download = await request.get(`${base}/documents/${document.id}/download`, { headers: owner });
  expect(download.status()).toBe(200);
  expect((await download.body()).toString()).toBe(content);
});
