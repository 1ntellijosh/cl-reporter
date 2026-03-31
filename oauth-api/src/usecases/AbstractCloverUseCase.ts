/**
 * Contains business logic for interacting with the Clover API and database for merchant access tokens
 *
 * @since app-login--J
 */
import { MerchantsRepository } from '@reporter/middleware';
import { RequestMaker } from '@reporter/common';
import { CloverTokenResponse } from '@reporter/common';

export abstract class AbstractCloverUseCase {
  /**
   * Constructor
   */
  constructor() {}

  /**
   * Determines the billing status of a merchant
   *
   * @param isInTrial - Whether the merchant is in a trial period
   * @param status - 'ACTIVE' | 'INACTIVE' | 'LAPSED' | 'SUPPRESSED'
   *
   * @returns 'ACTIVE' | 'INACTIVE' | 'TRIAL'
   */
  protected determineBillingStatus(isInTrial: boolean, status: string): 'ACTIVE' | 'INACTIVE' | 'TRIAL' {
    if (isInTrial) return 'TRIAL';
    
    /**
     * Return INACTIVE for all states that do not indicate active subscription access
     * https://docs.clover.com/dev/reference/appsgetmerchantbillinginfo-3
     */
    return status === 'ACTIVE' || status === 'SUPPRESSED' ? 'ACTIVE' : 'INACTIVE';
  }

  /**
   * Checks if a token is expired
   *
   * @param tokenExpiration
   *
   * @returns {boolean}
   */
  protected tokenIsExpired(tokenExpiration: number): boolean {
    return tokenExpiration < Date.now() / 1000;
  }

  /**
   * Refreshes an access token
   *
   * @param cloverMerchantId
   * @param refreshToken
   *
   * @returns New access_token string for immediate use (e.g. billing_info).
   */
  protected async refreshAccessToken(cloverMerchantId: string, refreshToken: string): Promise<string> {
    await MerchantsRepository.setNeedsReauth(cloverMerchantId);

    const url = `${process.env.CLOVER_OAUTH_TOKEN_BASE}/oauth/v2/refresh`;
    const response = (await RequestMaker.callOutbound('post', url, [
      {
        refresh_token: refreshToken,
        client_id: process.env.CLOVER_CLIENT_ID,
        grant_type: 'refresh_token',
      },
    ])) as CloverTokenResponse;

    await MerchantsRepository.storeAccessTokenData(
      cloverMerchantId,
      response.access_token,
      response.access_token_expiration,
    );

    return response.access_token;
  }
}
