/**
 * API dictionary for calls to the OAuth service
 *
 * @since app-login--JP
 */
import type { OAuthExchangeCodeResponse, OAuthBillingStatusResponse } from '../contracts/OAuthContracts';
import { RequestMaker } from './RequestMaker';

export const OAuthAPIs = {
  /**
   * Exchanges a Clover code for a Clover API token
   *
   * @param {object} body  The body of the request
   *   @prop {string} code  The code to exchange
   *   @prop {string} redirectUri  The redirect URI
   *
   * @returns Parsed JSON body from oauth-api (no Fetch `Response`).
   */
  exchangeCloverCode: function (
    body: { code: string; redirectUri: string },
    config: Record<string, any> = {},
  ): Promise<OAuthExchangeCodeResponse> {
    return RequestMaker.post('/api/oauth/exchange-clover-code', body, config) as unknown as Promise<OAuthExchangeCodeResponse>;
  },

  /**
   * Gets a Clover API token for a given merchant ID
   *
   * @param {object} body  The body of the request
   *   @prop {string} merchantId  The ID of the merchant
   *   @prop {Record<string, any>} config  The config for the request
   *
   * @returns {Promise<Response>}
   */
  getCloverAPIToken: function (
    body: { merchantId: string },
    config: Record<string, any> = {},
  ): Promise<unknown> {
    return RequestMaker.post('/api/oauth/get-clover-api-token', body, config);
  },

  /**
   * Gets billing info for a given merchant. Requires the merchant OAuth access token (Bearer), not client_secret.
   *
   * @see https://docs.clover.com/dev/reference/appsgetmerchantbillinginfo-3
   *
   * @returns {Promise<OAuthBillingStatusResponse>}
   */
  getCloverBillingInfo: function (): Promise<OAuthBillingStatusResponse> {
    return RequestMaker.get(`/api/oauth/get-clover-billing-info`) as unknown as Promise<OAuthBillingStatusResponse>;
  },
};
