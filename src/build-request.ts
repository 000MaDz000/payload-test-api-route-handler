import { createPayloadRequest } from 'payload';
import type { PayloadRequest, SanitizedConfig } from 'payload';

/**
 * Build a PayloadRequest from standard URL, method, headers and body
 */
export async function buildPayloadRequest(
  config: SanitizedConfig,
  url: string,
  method: string,
  headersMap: Record<string, string>,
  body?: unknown,
): Promise<PayloadRequest> {
  const headers = new Headers();
  for (const [key, value] of Object.entries(headersMap)) {
    headers.set(key, value);
  }

  let bodyInit: BodyInit | undefined = undefined;
  if (body !== undefined && body !== null) {
    if (typeof body === 'string' || typeof body === 'number' || typeof body === 'boolean') {
      bodyInit = String(body);
    } else {
      bodyInit = JSON.stringify(body);
      if (!headers.has('content-type')) {
        headers.set('content-type', 'application/json');
      }
    }
  }

  // Create standard web Request
  const webRequest = new Request(url, {
    method: method.toUpperCase(),
    headers,
    body: bodyInit,
  });

  return await createPayloadRequest({
    config,
    request: webRequest,
  });
}
