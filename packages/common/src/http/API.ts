/**
 * API dictionary holds all the API definitions for all the services in the Clover Reporter project
 * 
 * @since app-login--JP
 */
import { OAuthAPIs } from './OAuthAPIs';

export const API = {
  auth: OAuthAPIs,
} as const;
