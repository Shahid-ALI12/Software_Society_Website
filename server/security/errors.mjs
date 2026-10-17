// Internal building block. Route handlers must serialize only these safe messages.
export class RequestError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = 'RequestError';
    this.status = status;
    this.code = code;
  }
}

export function errorResponse(error) {
  const safe = error instanceof RequestError
    ? error
    : new RequestError(500, 'internal_error', 'Request could not be completed.');
  return Response.json({ error: safe.code, message: safe.message }, {
    status: safe.status,
    headers: { 'Cache-Control': 'private, no-store' },
  });
}
