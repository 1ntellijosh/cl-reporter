/**
 * API dictionary for calls to the Clover API
 *
 * @since app-login--JP
 */

import { RequestMaker } from '@reporter/common';
import { CloverTokenResponse, CloverBillingInfoResponse, GetValidCloverTokenResponse } from '@reporter/common';

export const CloverAPIs = {
  /**
   * Exchanges a Clover authorization code for a Clover API tokens
   *
   * @param {object} body  The body of the request
   *   @prop {string} code  The code to exchange
   *   @prop {string} redirectUri  The redirect URI
   *   @prop {string} clientId  The client ID
   *   @prop {string} clientSecret  The client secret
   * @param {Record<string, any>} config  The config for the request (if any)
   *
   * @returns {Promise<Response>}
   */
  exchangeCloverCode: function (
    code: string,
    redirectUri: string,
    config: Record<string, any> = {}
  ): Promise<CloverTokenResponse> {
    return RequestMaker.callOutbound(
      'post',
      `${process.env.CLOVER_OAUTH_TOKEN_BASE}/oauth/v2/token`,
      [
        {
          code,
          redirect_uri: redirectUri,
          client_id: process.env.CLOVER_CLIENT_ID,
          client_secret: process.env.CLOVER_CLIENT_SECRET,
        },
        config
      ],
    );
  },

  /**
   * Gets a new Clover API token for a given merchant ID using the refresh token
   *
   * @param {string} merchantId
   *
   * @returns {Promise<GetValidCloverTokenResponse>}
   */
  getCloverAPIToken: function (merchantId: string, refreshToken: string): Promise<GetValidCloverTokenResponse> {
    return RequestMaker.get(`/api/merchants/${merchantId}/api-token`) as unknown as Promise<GetValidCloverTokenResponse>;
  },

  /**
   * Gets billing info for a given merchant. Requires the merchant OAuth access token (Bearer), not client_secret.
   *
   * @see https://docs.clover.com/dev/reference/appsgetmerchantbillinginfo-3
   *
   * @param {string} merchantId
   * @param {string} accessToken
   *
   * @returns {Promise<CloverBillingInfoResponse>}
   */
  getCloverBillingInfo: function (
    merchantId: string,
    accessToken: string,
  ): Promise<CloverBillingInfoResponse> {
    const url = `${process.env.CLOVER_OAUTH_TOKEN_BASE}/v3/apps/${process.env.CLOVER_CLIENT_ID}/merchants/${merchantId}/billing_info`;

    return RequestMaker.callOutbound('get', url, [
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    ]);
  },
} as const;