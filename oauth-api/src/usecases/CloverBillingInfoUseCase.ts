/**
 * Use case for getting Clover billing info for a given merchant
 *
 * @since app-login--JP
 */

import { CloverBillingInfoResponse, OAuthBillingStatusResponse } from '@reporter/common';
import { CloverAPIs } from '../lib/http/CloverAPIs';
import { ServerError } from '@reporter/common';
import { AbstractCloverUseCase } from './AbstractCloverUseCase';

export class CloverBillingInfoUseCase extends AbstractCloverUseCase {
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
      const { accessToken } = await this.retrieveAccessTokenData(merchantId);

      const response = await CloverAPIs.getCloverBillingInfo(merchantId, accessToken) as CloverBillingInfoResponse;

      return { billingStatus: this.determineBillingStatus(response.isInTrial, response.status) };
    } catch (error) {
      // TODO AGENT: Add logging here
      // appLogger.error('Error getting Clover billing info:', error);
      console.error('Error getting Clover billing info:', error);
      throw new ServerError('Error getting Clover billing info. Please try again later.');
    }
  }
}
