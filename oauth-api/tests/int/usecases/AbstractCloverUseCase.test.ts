/**
 * Integration tests for AbstractCloverUseCase
 *
 * @since setup-tests--JP
 */
import { AbstractCloverUseCase } from '../../../src/usecases/AbstractCloverUseCase';
import {
  cloverMerchantId,
  accessToken,
  accessTokenExpiration,
  refreshTokenExpiration,
  refreshToken,
  setEnvVars,
  seedMerchantsRepository,
} from '../IntegrationTestHelpers';

class TestCloverUseCase extends AbstractCloverUseCase {
  constructor() {
    super();
  }

  async execute(merchantId: string): Promise<any> {
    return;
  }

  testDetermineBillingStatus(isInTrial: boolean, status: string): 'ACTIVE' | 'INACTIVE' | 'TRIAL' {
    return this.determineBillingStatus(isInTrial, status);
  }

  testTokenIsExpired(tokenExpiration: number): boolean {
    return this.tokenIsExpired(tokenExpiration);
  }

  async testRetrieveAccessTokenData(merchantId: string): Promise<{ accessToken: string, accessTokenExpiration: number }> {
    return this.retrieveAccessTokenData(merchantId);
  }

  async testRefreshAccessToken(merchantId: string, refreshToken: string): Promise<{ accessToken: string, accessTokenExpiration: number }> {
    return this.refreshAccessToken(merchantId, refreshToken);
  }
}

jest.mock('@reporter/common', () => ({
  RequestMaker: {
    callOutbound: jest.fn().mockResolvedValue({
      access_token: 'new-access-token',
      access_token_expiration: Math.floor(Date.now() / 1000 + 10000),
    }),
  },
}));

const useCase = new TestCloverUseCase();

describe('AbstractCloverUseCase', () => {
  beforeEach(async () => {
    setEnvVars();
    await seedMerchantsRepository();
  });

  describe('determineBillingStatus', () => {
    it('should return correct billing status from given Clover billing info status', () => {
      let result = useCase.testDetermineBillingStatus(false, 'ACTIVE');
      expect(result).toBe('ACTIVE');
      result = useCase.testDetermineBillingStatus(false, 'SUPPRESSED');
      expect(result).toBe('ACTIVE');
      result = useCase.testDetermineBillingStatus(false, 'INACTIVE');
      expect(result).toBe('INACTIVE');
      result = useCase.testDetermineBillingStatus(false, 'LAPSED');
      expect(result).toBe('INACTIVE');
      result = useCase.testDetermineBillingStatus(true, 'ACTIVE');
      expect(result).toBe('TRIAL');
    });
  });

  describe('tokenIsExpired', () => {
    it('should return true if token is expired', () => {
      let result = useCase.testTokenIsExpired(Math.floor(Date.now() / 1000 - 5));
      expect(result).toBe(true);
    });

    it('should return false if token is not expired', () => {
      let result = useCase.testTokenIsExpired(Math.floor(Date.now() / 300000 + refreshTokenExpiration));
      expect(result).toBe(false);
    });
  });

  describe('retrieveAccessTokenData', () => {
    it('should return access token data from merchants table', async () => {
      const result = await useCase.testRetrieveAccessTokenData(cloverMerchantId);
      expect(result).toBeDefined();
      expect(result.accessToken).toBe(accessToken);
      expect(result.accessTokenExpiration).toBe(accessTokenExpiration);
    });
  });

  describe('refreshAccessToken', () => {
    it('should return refreshed access token data from merchants table', async () => {
      const result = await useCase.testRefreshAccessToken(cloverMerchantId, refreshToken);
      expect(result).toBeDefined();
      expect(result.accessToken).toBe('new-access-token');
      expect(result.accessTokenExpiration).not.toBe(refreshTokenExpiration);
    });
  });
});