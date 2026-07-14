import type { AxiosRequestConfig, AxiosResponse } from 'axios';
import type { SanitizedConfig, PayloadRequest } from 'payload';
import { matchEndpoint } from './match-endpoint.js';
import { buildPayloadRequest } from './build-request.js';
import { HandlerExecutionError } from './errors.js';

export interface AxiosAdapterOptions {
  config: SanitizedConfig;
  requestPatcher?: (req: PayloadRequest) => PayloadRequest | Promise<PayloadRequest>;
}

/**
 * Creates an axios-compatible adapter that dynamically matches and routes requests to Payload CMS handlers
 */
export function createAxiosAdapter(options: AxiosAdapterOptions) {
  return async (axiosConfig: AxiosRequestConfig): Promise<AxiosResponse> => {
    // 1. Build the full URL
    const urlStr = axiosConfig.url ?? '';
    const urlObj = new URL(urlStr, 'http://localhost');

    if (axiosConfig.params) {
      for (const [key, value] of Object.entries(axiosConfig.params as Record<string, unknown>)) {
        if (value !== undefined && value !== null) {
          urlObj.searchParams.append(
            key,
            typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
              ? String(value)
              : JSON.stringify(value),
          );
        }
      }
    }

    // 2. Resolve request method and headers
    const method = axiosConfig.method ?? 'GET';
    const headersMap: Record<string, string> = {};
    if (axiosConfig.headers) {
      const headersObj =
        typeof axiosConfig.headers.toJSON === 'function'
          ? axiosConfig.headers.toJSON()
          : axiosConfig.headers;
      for (const [key, value] of Object.entries(headersObj as Record<string, unknown>)) {
        if (
          value !== undefined &&
          value !== null &&
          (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean')
        ) {
          headersMap[key] = String(value);
        }
      }
    }

    // 3. Resolve the endpoint handler and matching route parameters dynamically
    const match = matchEndpoint(options.config, urlObj.pathname, method);
    const activeHandler = match.endpoint.handler;
    const matchedParams = match.params;
    let collectionSlug: string | undefined = undefined;
    let globalSlug: string | undefined = undefined;

    if (match.source === 'collection' && match.sourceName) {
      collectionSlug = match.sourceName;
    } else if (match.source === 'global' && match.sourceName) {
      globalSlug = match.sourceName;
    }

    // 4. Build standard PayloadRequest
    let req = await buildPayloadRequest(
      options.config,
      urlObj.toString(),
      method,
      headersMap,
      axiosConfig.data,
    );

    // 5. Populate route parameters
    req.routeParams = {
      ...matchedParams,
    };

    if (collectionSlug) {
      req.routeParams.collection = collectionSlug;
      (req as PayloadRequest & { collection?: unknown }).collection =
        req.payload.collections[collectionSlug];
    }

    if (globalSlug) {
      req.routeParams.global = globalSlug;
    }

    // 6. Run patcher if provided
    if (options.requestPatcher) {
      req = await options.requestPatcher(req);
    }

    // 7. Execute the handler
    let response: Response;
    try {
      response = await activeHandler(req);
    } catch (err) {
      throw new HandlerExecutionError(err instanceof Error ? err.message : String(err));
    }

    // 8. Convert response headers
    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    // 9. Convert response body
    let responseData: unknown;
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      const text = await response.text();
      try {
        responseData = JSON.parse(text);
      } catch {
        responseData = text;
      }
    } else {
      responseData = await response.text();
    }

    const axiosResponse = {
      data: responseData,
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
      config: axiosConfig,
    } as unknown as AxiosResponse;

    // 10. Validate status to reject promise (simulating Axios's validateStatus behavior)
    const validateStatus =
      axiosConfig.validateStatus ?? ((status: number) => status >= 200 && status < 300);

    if (!validateStatus(response.status)) {
      interface MockAxiosError extends Error {
        config?: AxiosRequestConfig;
        response?: AxiosResponse;
        isAxiosError: boolean;
      }
      const error = new Error(
        `Request failed with status code ${String(response.status)}`,
      ) as MockAxiosError;
      error.config = axiosConfig;
      error.response = axiosResponse;
      error.isAxiosError = true;
      throw error;
    }

    return axiosResponse;
  };
}
