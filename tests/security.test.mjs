import test from 'node:test';
import assert from 'node:assert/strict';
import { createAuthorizer } from '../server/security/authorize.mjs';
import { errorResponse, RequestError } from '../server/security/errors.mjs';
import { readJsonBody, validateContact, validateSuggestion } from '../server/security/submissions.mjs';

const projectId = 'demo-society-security';
const verifiedToken = {
  uid: 'student-1', aud: projectId,
  iss: `https://securetoken.google.com/${projectId}`, email_verified: true,
};
const validUser = { uid: 'student-1', emailVerified: true, disabled: false, customClaims: {} };
const request = () => new Request('https://society.example/api', {
  headers: { authorization: 'Bearer header.payload.signature' },
});
function setup({ token = verifiedToken, user = validUser, failure } = {}) {
  const calls = [];
  const auth = {
    async verifyIdToken(value, checkRevoked) {
      calls.push({ value, checkRevoked });
      if (failure) throw failure;
      return token;
    },
    async getUser(uid) { calls.push({ uid }); return user; },
  };
  return { authorize: createAuthorizer({ auth, projectId }), calls };
}
const status = expected => error => error instanceof RequestError && error.status === expected;

test('verified member can submit, SDK is required to check revocation', async () => {
  const { authorize, calls } = setup();
  assert.deepEqual(await authorize(request(), 'suggestion:submit'), { uid: 'student-1', role: 'member' });
  assert.equal(calls[0].checkRevoked, true);
});

test('forged token role cannot elevate a member', async () => {
  const { authorize } = setup({ token: { ...verifiedToken, role: 'admin' } });
  await assert.rejects(authorize(request(), 'inbox:read'), status(403));
});

test('editor can edit content but cannot access private inbox or roles', async () => {
  const { authorize } = setup({ user: { ...validUser, customClaims: { role: 'editor' } } });
  assert.equal((await authorize(request(), 'content:write')).role, 'editor');
  await assert.rejects(authorize(request(), 'inbox:read'), status(403));
  await assert.rejects(authorize(request(), 'roles:write'), status(403));
});

test('administrator can moderate but unknown operations fail closed', async () => {
  const { authorize } = setup({ user: { ...validUser, customClaims: { role: 'admin' } } });
  assert.equal((await authorize(request(), 'alumni:moderate')).role, 'admin');
  await assert.rejects(authorize(request(), 'delete:everything'), status(403));
});

test('new requests observe role demotion even with the old token', async () => {
  const user = { ...validUser, customClaims: { role: 'admin' } };
  const { authorize } = setup({ user, token: { ...verifiedToken, role: 'admin' } });
  await authorize(request(), 'inbox:read');
  user.customClaims.role = 'member';
  await assert.rejects(authorize(request(), 'inbox:read'), status(403));
});

for (const code of ['auth/id-token-expired', 'auth/id-token-revoked', 'auth/user-disabled']) {
  test(`${code} prevents access`, async () => {
    const { authorize } = setup({ failure: { code } });
    await assert.rejects(authorize(request(), 'contact:submit'), status(401));
  });
}

test('auth service failure denies access without leaking error detail', async () => {
  const { authorize } = setup({ failure: new Error('private credential details') });
  await assert.rejects(authorize(request(), 'contact:submit'), error => {
    assert.equal(error.status, 503);
    assert.doesNotMatch(error.message, /credential/);
    return true;
  });
});

test('wrong project tokens, unverified and disabled users cannot submit', async () => {
  for (const token of [
    { ...verifiedToken, aud: 'another-project' },
    { ...verifiedToken, iss: 'https://attacker.example' },
  ]) await assert.rejects(setup({ token }).authorize(request(), 'contact:submit'), status(401));
  await assert.rejects(setup({ user: { ...validUser, emailVerified: false } })
    .authorize(request(), 'contact:submit'), status(403));
  await assert.rejects(setup({ user: { ...validUser, disabled: true } })
    .authorize(request(), 'contact:submit'), status(401));
});

test('unknown role does not receive member permissions', async () => {
  const { authorize } = setup({ user: { ...validUser, customClaims: { role: 'superadmin' } } });
  await assert.rejects(authorize(request(), 'contact:submit'), status(403));
});

test('missing/malformed/oversized tokens never reach Firebase', async () => {
  const { authorize, calls } = setup();
  for (const header of ['', 'Basic abc', 'Bearer a.b.c, Bearer a.b.c', `Bearer ${'a'.repeat(9000)}`]) {
    await assert.rejects(authorize(new Request('https://society.example/api', {
      headers: { authorization: header },
    }), 'contact:submit'), status(401));
  }
  await assert.rejects(authorize(new Request('https://society.example/api?token=a.b.c', {
    headers: { cookie: 'token=a.b.c' },
  }), 'contact:submit'), status(401));
  assert.equal(calls.length, 0);
});

function jsonRequest(body, headers = {}) {
  return new Request('https://society.example/api', {
    method: 'POST', body, headers: { 'content-type': 'application/json', ...headers },
  });
}

test('JSON parser bounds actual bytes when Content-Length is missing or false', async () => {
  for (const headers of [{}, { 'content-length': '2' }]) {
    await assert.rejects(readJsonBody(jsonRequest(JSON.stringify({ message: 'x'.repeat(17000) }), headers)), status(413));
  }
});

test('non-JSON, compressed, malformed and non-object bodies rejected', async () => {
  await assert.rejects(readJsonBody(jsonRequest('{}', { 'content-type': 'text/plain' })), status(415));
  await assert.rejects(readJsonBody(jsonRequest('{}', { 'content-encoding': 'gzip' })), status(415));
  for (const value of ['null', '[]', 'true', '{', '']) {
    await assert.rejects(readJsonBody(jsonRequest(value)), status(400));
  }
});

test('contact input allows only intended fields and enforces lengths and types', async () => {
  const body = { name: ' Student ', email: 'student@example.com', message: 'Please share the event schedule.' };
  const parsed = await readJsonBody(jsonRequest(JSON.stringify(body)));
  assert.equal(validateContact(parsed).name, 'Student');
  for (const change of [
    { role: 'admin' }, { uid: 'somebody-else' }, { status: 'approved' },
    { createdAt: 'yesterday' }, { password: 'not-stored' },
    { email: 'invalid-address' }, { message: 'x'.repeat(4001) }, { name: {} },
  ]) assert.throws(() => validateContact({ ...body, ...change }), status(400));
  assert.throws(() => validateContact(JSON.parse('{"__proto__":{"admin":true}}')), status(400));
});

test('suggestion validation permits optional name but rejects unknown category/control characters', () => {
  assert.equal(validateSuggestion({ category: 'event', message: 'Please run a coding workshop.' }).name, '');
  assert.throws(() => validateSuggestion({ category: 'admin', message: 'Please do this.' }), status(400));
  assert.throws(() => validateSuggestion({ category: 'event', message: 'Hello\u0000 world' }), status(400));
});

test('error responses are private and redact unexpected exceptions', async () => {
  const response = errorResponse(new Error('private service account data'));
  assert.equal(response.status, 500);
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  assert.doesNotMatch(await response.text(), /service account/);
});
