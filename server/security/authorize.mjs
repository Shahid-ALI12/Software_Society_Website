import { RequestError } from './errors.mjs';

// Server-only authorization used by api/portal.js.
// Supply an actual Firebase Admin Auth instance, initialized for projectId.
// Do not supply a JWT decoder or any client-provided verifier/user record.
const permissions = new Map([
  ['suggestion:submit', new Set(['member', 'editor', 'admin'])],
  ['contact:submit', new Set(['member', 'editor', 'admin'])],
  ['alumni:apply', new Set(['member', 'editor', 'admin'])],
  ['content:write', new Set(['editor', 'admin'])],
  ['inbox:read', new Set(['admin'])],
  ['alumni:moderate', new Set(['admin'])],
  ['settings:write', new Set(['admin'])],
]);

const invalidCredentials = new Set([
  'auth/argument-error', 'auth/invalid-argument', 'auth/invalid-id-token',
  'auth/id-token-expired', 'auth/id-token-revoked',
  'auth/user-disabled', 'auth/user-not-found',
]);

function denied() {
  return new RequestError(403, 'forbidden', 'You do not have access to this action.');
}

function unauthenticated() {
  return new RequestError(401, 'unauthenticated', 'Please sign in again.');
}

export function createAuthorizer({ auth, projectId }) {
  if (!projectId || typeof projectId !== 'string' ||
      typeof auth?.verifyIdToken !== 'function' || typeof auth?.getUser !== 'function') {
    throw new TypeError('A project ID and Firebase Admin Auth instance are required.');
  }

  return async function authorize(request, action) {
    const allowed = permissions.get(action);
    if (!allowed) throw denied();

    const header = request.headers.get('authorization');
    // Bound token size and reject duplicate headers, cookies and query-string tokens.
    if (!header || header.length > 8192) throw unauthenticated();
    const match = /^Bearer ([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)$/i.exec(header);
    if (!match) throw unauthenticated();

    let token;
    let user;
    try {
      // Firebase validates signature, expiry and project; true checks revocation.
      token = await auth.verifyIdToken(match[1], true);
      if (typeof token.uid !== 'string' || token.uid.length === 0 ||
          token.aud !== projectId || token.iss !== `https://securetoken.google.com/${projectId}`) {
        throw unauthenticated();
      }
      // Fetch current privileges rather than accepting stale role claims in an ID token.
      // Deliberately uncached: new requests see a role demotion/disabled account.
      user = await auth.getUser(token.uid);
    } catch (error) {
      if (error instanceof RequestError) throw error;
      if (invalidCredentials.has(error?.code)) throw unauthenticated();
      // Dependency outages must never turn into anonymous or privileged access.
      throw new RequestError(503, 'auth_unavailable', 'Sign-in verification is temporarily unavailable.');
    }

    if (user.uid !== token.uid || user.disabled === true) throw unauthenticated();
    if (user.emailVerified !== true || token.email_verified !== true) {
      throw new RequestError(403, 'email_not_verified', 'Verify your email and sign in again.');
    }
    const role = user.customClaims?.role ?? 'member';
    if (!allowed.has(role)) throw denied();
    return Object.freeze({ uid: user.uid, role });
  };
}
