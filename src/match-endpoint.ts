import type { SanitizedConfig, Endpoint } from 'payload';
import { EndpointNotFoundError } from './errors.js';

export interface MatchResult {
  endpoint: Endpoint;
  params: Record<string, string>;
  source: 'config' | 'collection' | 'global';
  sourceName?: string;
}

/**
 * Match a pattern path with a pathname and extract parameters
 * e.g. pattern="/api/users/:id", pathname="/api/users/123" -> { id: "123" }
 */
export function matchRoute(pattern: string, pathname: string): Record<string, string> | null {
  const patternParts = pattern.replace(/^\/+/, '').replace(/\/+$/, '').split('/');
  const pathParts = pathname.replace(/^\/+/, '').replace(/\/+$/, '').split('/');

  if (patternParts.length !== pathParts.length) {
    return null;
  }

  const params: Record<string, string> = {};

  for (let i = 0; i < patternParts.length; i++) {
    const patternPart = patternParts[i];
    const pathPart = pathParts[i];

    if (patternPart.startsWith(':')) {
      const paramName = patternPart.slice(1);
      params[paramName] = decodeURIComponent(pathPart);
    } else if (patternPart.toLowerCase() !== pathPart.toLowerCase()) {
      return null;
    }
  }

  return params;
}

/**
 * Traverse Payload config endpoints to find a match for pathname and method
 */
export function matchEndpoint(
  config: SanitizedConfig,
  pathname: string,
  method: string,
): MatchResult {
  const apiRoute = config.routes.api;
  const reqMethod = method.toLowerCase();

  // 1. Check Global Config Endpoints
  for (const endpoint of config.endpoints) {
    if (endpoint.method.toLowerCase() === reqMethod) {
      let cleanPath = endpoint.path;
      if (cleanPath !== '/' && !cleanPath.startsWith('/')) {
        cleanPath = `/${cleanPath}`;
      }
      const endPath = cleanPath === '/' ? '' : cleanPath;
      const pattern = `${apiRoute}${endPath}`;
      const params = matchRoute(pattern, pathname);
      if (params) {
        return { endpoint, params, source: 'config' };
      }
    }
  }

  // 2. Check Collection Endpoints
  for (const collection of config.collections) {
    if (collection.endpoints) {
      for (const endpoint of collection.endpoints) {
        if (endpoint.method.toLowerCase() === reqMethod) {
          let cleanPath = endpoint.path;
          if (cleanPath !== '/' && !cleanPath.startsWith('/')) {
            cleanPath = `/${cleanPath}`;
          }
          const endPath = cleanPath === '/' ? '' : cleanPath;
          const pattern = `${apiRoute}/${collection.slug}${endPath}`;
          const params = matchRoute(pattern, pathname);
          if (params) {
            return { endpoint, params, source: 'collection', sourceName: collection.slug };
          }
        }
      }
    }
  }

  // 3. Check Global Config Collection/Global Endpoints
  for (const globalConfig of config.globals) {
    if (globalConfig.endpoints) {
      for (const endpoint of globalConfig.endpoints) {
        if (endpoint.method.toLowerCase() === reqMethod) {
          let cleanPath = endpoint.path;
          if (cleanPath !== '/' && !cleanPath.startsWith('/')) {
            cleanPath = `/${cleanPath}`;
          }
          const endPath = cleanPath === '/' ? '' : cleanPath;
          const pattern = `${apiRoute}/globals/${globalConfig.slug}${endPath}`;
          const params = matchRoute(pattern, pathname);
          if (params) {
            return { endpoint, params, source: 'global', sourceName: globalConfig.slug };
          }
        }
      }
    }
  }

  throw new EndpointNotFoundError(
    `No matching endpoint found for pathname "${pathname}" with method "${method.toUpperCase()}"`,
  );
}
