/**
 * Class for Auth Service business logic
 *
 * @since users-service-continued--JP
 */
import { OAuthExchangeCodeResponse, OAuthBillingStatusResponse, GetValidCloverTokenResponse } from '@reporter/common';
import { CloverTokenExchangeUseCase } from './usecases/CloverTokenExchangeUseCase';
import { CloverBillingInfoUseCase } from './usecases/CloverBillingInfoUseCase';
import { GetCloverAPITokenUseCase } from './usecases/GetCloverAPITokenUseCase';

export class OAuthService {
  /**
   * Exchanges a Clover authorization code for a Clover API tokens
   *
   * @param {string} code
   * @param {string} redirectUri
   *
   * @returns {Promise<string>}
   *
   * @throws {ServerError}  If there is an error exchanging the Clover code
   */
  async onExchangeCloverCode(code: string, redirectUri: string): Promise<OAuthExchangeCodeResponse> {
    return await new CloverTokenExchangeUseCase().execute(code, redirectUri);
  }

  /**
   * Gets a Clover API token for a given merchant ID
   *
   * @param {string} merchantId
   *
   * @returns {Promise<string>}
   *
   * @throws {BadRequestError}  If merchant ID is not found
   */
  async getCloverAPIToken(merchantId: string): Promise<GetValidCloverTokenResponse> {
    return await new GetCloverAPITokenUseCase().execute(merchantId);
  }

  /**
   * Gets Clover billing info for a given merchant
   *
   * @param {string} merchantId
   *
   * @returns {Promise<OAuthBillingStatusResponse>}
   */
  async getCloverBillingInfo(merchantId: string): Promise<OAuthBillingStatusResponse> {
    return await new CloverBillingInfoUseCase().execute(merchantId);
  }
}
