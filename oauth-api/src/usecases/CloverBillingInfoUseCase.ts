/**
 * Use case for getting Clover billing info for a given merchant
 *
 * @since app-login--JP
 */

import { CloverBillingInfoResponse, OAuthBillingStatusResponse } from '@reporter/common';
import { CloverAPIs } from '../lib/http/CloverAPIs';
import { MerchantsRepository } from '@reporter/middleware';
import { ServerError } from '@reporter/common';
import { AbstractCloverUseCase } from './AbstractCloverUseCase';

export class CloverBillingInfoUseCase extends AbstractCloverUseCase {
  /**
   * Constructor
   */
  constructor() {
    super();
  }

  /**
   * Gets Clover billing info for a given merchant
   *
   * @param {string} merchantId
   *
   * @returns {Promise<OAuthBillingStatusResponse>}
   */
  async execute(merchantId: string): Promise<OAuthBillingStatusResponse> {
    try {
      // Get the access token for the merchant
      let accessToken;
      let accessTokenResult = await MerchantsRepository.getAccessToken(merchantId) as { accessToken: string, accessTokenExpiration: number } | null;

      // If the access token is expired, refresh it
      if (!accessTokenResult || this.tokenIsExpired(accessTokenResult.accessTokenExpiration)) {
        const refreshTokenResult = await MerchantsRepository.getRefreshToken(merchantId) as { refreshToken: string, refreshTokenExpiration: number } | null;
        if (!refreshTokenResult) {
          throw new ServerError('No refresh token found for merchant');
        }
        accessToken = await this.refreshAccessToken(merchantId, refreshTokenResult.refreshToken);
      } else {
        accessToken = accessTokenResult.accessToken;
      }

      const response = await CloverAPIs.getCloverBillingInfo(merchantId, accessToken) as CloverBillingInfoResponse;

      return { billingStatus: this.determineBillingStatus(response.isInTrial, response.status) };
    } catch (error) {
      // TODO AGENT: Add logging here
      console.error('Error getting Clover billing info:', error);
      throw new ServerError('Error getting Clover billing info. Please try again later.');
    }
  }
}
