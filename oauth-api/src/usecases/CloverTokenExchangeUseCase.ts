/**
 * Use case for exchanging a Clover authorization code for a Clover API tokens
 *
 * @since app-login--JP
 */

import {
  OAuthExchangeCodeResponse,
  CloverTokenResponse,
  CloverBillingInfoResponse,
  parseCloverMerchantIdFromAccessJwt,
  ServerError,
} from '@reporter/common';
import { MerchantsRepository } from '@reporter/middleware';
import { CloverAPIs } from '../lib/http/CloverAPIs';
import { AbstractCloverUseCase } from './AbstractCloverUseCase';

export class CloverTokenExchangeUseCase extends AbstractCloverUseCase {
  constructor() {
    super();
  }

  /**
   * Exchanges a Clover authorization code for a Clover API tokens
   *
   * @param code
   * @param redirectUri
   *
   * @returns {Promise<OAuthExchangeCodeResponse>}
   */
  async execute(code: string, redirectUri: string): Promise<OAuthExchangeCodeResponse> {
    try {
      // 1. Exchange the Clover authorization code for a Clover API tokens with clover API
      const response = await CloverAPIs.exchangeCloverCode(code, redirectUri) as CloverTokenResponse;

      const cloverMerchantId = parseCloverMerchantIdFromAccessJwt(response.access_token);

      // 2. Store refresh_token and refresh_token_expiration in merchants table's refresh_token_ciphertext and refresh_token_expiration columns (upsert)
      await MerchantsRepository.storeRefreshTokenData(
        cloverMerchantId,
        response.refresh_token,
        response.refresh_token_expiration,
      );

      // 3. Ensure we have a current access token (refresh if expired); billing_info requires Bearer merchant token.
      let accessTokenForApi = response.access_token;

      if (this.tokenIsExpired(response.access_token_expiration)) {
        const accessTokenData = await this.refreshAccessToken(cloverMerchantId, response.refresh_token);
        accessTokenForApi = accessTokenData.accessToken;
      } else {
        await MerchantsRepository.storeAccessTokenData(
          cloverMerchantId,
          response.access_token,
          response.access_token_expiration,
        );
      }

      // 4. Get billing info for the merchant, and 
      const billingResponse = (await CloverAPIs.getCloverBillingInfo(
        cloverMerchantId,
        accessTokenForApi,
      )) as CloverBillingInfoResponse;

      const billingStatus = this.determineBillingStatus(billingResponse.isInTrial, billingResponse.status);
      // 5. Return the Clover merchant id so new app session JWT can be minted
      return { cloverMerchantId, billingStatus };
    } catch (error) {
      // TODO AGENT: Add logging here
      // appLogger.error('Error getting Clover billing info:', error);
      console.error('Error exchanging Clover code:', error);
      throw new ServerError('Error logging in with Clover. Please try again later.');
    }
  }
}