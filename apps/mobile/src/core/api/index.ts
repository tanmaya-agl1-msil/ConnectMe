import { appConfig } from '../config';
import { createApiClient } from './client';

export * from './client';
export * from './errors';

/** App-wide client instance. Features import this rather than calling fetch directly. */
export const apiClient = createApiClient({ baseUrl: appConfig.apiBaseUrl });
