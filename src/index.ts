import axios from 'axios';
import type { AxiosInstance, AxiosRequestConfig } from 'axios';
import type { SanitizedConfig, PayloadRequest } from 'payload';
import { createAxiosAdapter } from './axios-adapter.js';

export * from './errors.js';
export * from './match-endpoint.js';
export * from './build-request.js';
export * from './axios-adapter.js';

export interface CreateTesterAxiosOptions {
  /**
   * Optional patcher function to mutate standard PayloadRequest before handler execution
   */
  requestPatcher?: (req: PayloadRequest) => PayloadRequest | Promise<PayloadRequest>;

  /**
   * Optional default configuration for the created Axios instance
   */
  axiosConfig?: AxiosRequestConfig;
}

/**
 * Creates an AxiosInstance routed directly to Payload CMS handlers in-process
 */
export function createTesterAxios(
  config: SanitizedConfig,
  options?: CreateTesterAxiosOptions,
): AxiosInstance {
  const adapter = createAxiosAdapter({
    config,
    requestPatcher: options?.requestPatcher,
  });

  return axios.create({
    adapter,
    ...options?.axiosConfig,
  });
}
