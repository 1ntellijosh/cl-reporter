/**
 * Use case for getting a Clover API token for a given merchant
 *
 * @since app-skaffold--JP
 */

import { GetValidCloverTokenResponse, CloverBillingInfoResponse } from '@reporter/common';
import { ServerError } from '@reporter/common';
import { CloverAPIs } from '../lib/http/CloverAPIs';
import { AbstractCloverUseCase } from './AbstractCloverUseCase';

export class GetCloverAPITokenUseCase extends AbstractCloverUseCase {
  constructor() {
    super();
  }

  /**
   * Gets a Clover API token for a given merchant
   *
   * @param {string} merchantId
   *
   * @returns {Promise<GetValidCloverTokenResponse>}
   */
  async execute(merchantId: string): Promise<GetValidCloverTokenResponse> {
    try {
      const { accessToken, accessTokenExpiration } = await this.retrieveAccessTokenData(merchantId);

      const response = await CloverAPIs.getCloverBillingInfo(merchantId, accessToken) as CloverBillingInfoResponse;

      const billingStatus = this.determineBillingStatus(response.isInTrial, response.status);

      return {
        accessToken,
        expiresAt: accessTokenExpiration,
        billingStatus,
      };
    } catch (error) {
      // TODO AGENT: Add logging here
      // appLogger.error('GetCloverAPITokenUseCase: error getting Clover billing info', error);
      console.error('GetCloverAPITokenUseCase: error getting Clover billing info');
      throw new ServerError('Error getting Clover billing info. Please try again later.');
    }
  }
};

