import { RequestError } from './errors.mjs';

const MAX_BODY_BYTES = 16 * 1024;

function invalid() {
  return new RequestError(400, 'invalid_submission', 'Check the submitted fields.');
}

export async function readJsonBody(request) {
  const mime = request.headers.get('content-type')?.split(';')[0].trim().toLowerCase();
  if (mime !== 'application/json' ||
      ![null, 'identity'].includes(request.headers.get('content-encoding'))) {
    throw new RequestError(415, 'unsupported_media_type', 'Send an uncompressed JSON request.');
  }
  const length = request.headers.get('content-length');
  if (length !== null && (!/^\d+$/.test(length) || Number(length) > MAX_BODY_BYTES)) {
    throw new RequestError(413, 'body_too_large', 'The request is too large.');
  }
  if (!request.body) throw invalid();
  const reader = request.body.getReader();
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BODY_BYTES) {
        await reader.cancel();
        throw new RequestError(413, 'body_too_large', 'The request is too large.');
      }
      chunks.push(value);
    }
  } catch (error) {
    if (error instanceof RequestError) throw error;
    throw invalid();
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    const body = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
    if (body === null || Array.isArray(body) || typeof body !== 'object') throw invalid();
    return body;
  } catch {
    throw invalid();
  }
}

function objectWithFields(body, fields) {
  if (!body || Object.getPrototypeOf(body) !== Object.prototype ||
      Object.keys(body).some(key => !fields.includes(key))) throw invalid();
}

function text(value, min, max) {
  if (typeof value !== 'string') throw invalid();
  const result = value.trim();
  if (result.length < min || result.length > max ||
      /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(result)) throw invalid();
  return result;
}

export function validateSuggestion(body) {
  objectWithFields(body, ['category', 'name', 'message']);
  const category = text(body.category, 1, 32);
  if (!['general', 'event', 'website', 'academic', 'other'].includes(category)) throw invalid();
  return Object.freeze({
    category,
    name: body.name === undefined ? '' : text(body.name, 0, 120),
    message: text(body.message, 10, 4000),
  });
}

export function validateContact(body) {
  objectWithFields(body, ['name', 'email', 'message']);
  const email = text(body.email, 3, 254);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email)) throw invalid();
  return Object.freeze({ name: text(body.name, 1, 120), email, message: text(body.message, 10, 4000) });
}

// Validation is not HTML sanitization. Render these strings as text, never innerHTML.
// Create UID, moderation status and timestamps on the trusted server, not from body.
