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
   * Retrieves the access token data for a given merchant
   *
   * @param cloverMerchantId
   *
   * @returns {Promise<{ accessToken: string, accessTokenExpiration: number }>}
   */
  protected async retrieveAccessTokenData(cloverMerchantId: string): Promise<{ accessToken: string, accessTokenExpiration: number }> {
    // Get the access token for the merchant
    let accessTokenResult = await MerchantsRepository.getAccessToken(cloverMerchantId) as { accessToken: string, accessTokenExpiration: number } | null;

    // If the access token is expired, refresh it
    if (accessTokenResult && !this.tokenIsExpired(accessTokenResult.accessTokenExpiration)) {
      return {
        accessToken: accessTokenResult.accessToken,
        accessTokenExpiration: accessTokenResult.accessTokenExpiration,
      };
    }

    const refreshTokenResult = await MerchantsRepository.getRefreshToken(cloverMerchantId) as { refreshToken: string, refreshTokenExpiration: number } | null;
    
    if (!refreshTokenResult) {
      throw new Error('No refresh token found for merchant');
    }
    
    return await this.refreshAccessToken(cloverMerchantId, refreshTokenResult.refreshToken);
  }

  /**
   * Refreshes an access token
   *
   * @param cloverMerchantId
   * @param refreshToken
   *
   * @returns {Promise<{ accessToken: string, accessTokenExpiration: number }>}
   */
  protected async refreshAccessToken(cloverMerchantId: string, refreshToken: string): Promise<{ accessToken: string, accessTokenExpiration: number }> {
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

    return {
      accessToken: response.access_token,
      accessTokenExpiration: response.access_token_expiration,
    };
  }
}
