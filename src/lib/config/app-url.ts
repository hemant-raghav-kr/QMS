/**
 * Canonical Application URLs for Quartzite Management System (QMS)
 *
 * Strict Architecture:
 * - Production: ALWAYS resolves to https://quartzitemanagementsystem.vercel.app
 * - Development: Intentionally allows http://localhost:3000 for local testing
 * - Production code will NEVER silently fall back to localhost.
 */

export const PRODUCTION_APP_URL = 'https://quartzitemanagementsystem.vercel.app';
export const LOCAL_DEV_APP_URL = 'http://localhost:3000';

/**
 * Resolves the canonical base URL for the application without any trailing slash.
 */
export function getAppUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();

  // In production, enforce production canonical URL and reject any localhost leak
  if (process.env.NODE_ENV === 'production') {
    if (envUrl && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
      return envUrl.replace(/\/+$/, '');
    }
    return PRODUCTION_APP_URL;
  }

  // Development environment
  if (envUrl) {
    return envUrl.replace(/\/+$/, '');
  }

  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin.replace(/\/+$/, '');
  }

  return LOCAL_DEV_APP_URL;
}
