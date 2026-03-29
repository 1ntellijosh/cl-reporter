/**
 * Class for Auth Service business logic
 *
 * @since users-service-continued--JP
 */

export class OAuthService {
  // private userRepo: UserRepository;

  // constructor() {
  //   this.userRepo = new UserRepository();
  // }

  /**
   * Gets a Clover API token for a given merchant ID
   *
   * @param {string} merchantId
   *
   * @returns {Promise<string>}
   * 
   * @throws {BadRequestError}  If merchant ID is not found
   */
  async getCloverAPIToken(merchantId: string): Promise<string> {
    return 'token';
  }
}
