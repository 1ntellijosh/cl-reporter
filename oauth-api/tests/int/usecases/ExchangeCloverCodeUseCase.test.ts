/**
 * Integration tests for ExchangeCloverCodeUseCase
 *
 * @since setup-tests--JP
 */
import { CloverTokenExchangeUseCase } from '../../../src/usecases/CloverTokenExchangeUseCase';
import { CloverAPIs } from '../../../src/lib/http/CloverAPIs';
import {
  seedMerchantsRepository,
  cloverMerchantId,
  setEnvVars,
  accessTokenExpiration,
  refreshToken,
  refreshTokenExpiration,
  makeCloverJwtTokenString,
} from '../IntegrationTestHelpers';

const cloverJwtTokenString = makeCloverJwtTokenString(cloverMerchantId);

jest.mock('../../../src/lib/http/CloverAPIs', () => ({
  CloverAPIs: {
    getCloverBillingInfo: jest.fn(),
    exchangeCloverCode: jest.fn(),
  },
}));

function applyBillingInfoMock(billingStatus: 'ACTIVE' | 'INACTIVE') {
  (CloverAPIs.getCloverBillingInfo as jest.Mock).mockResolvedValue({
    isInTrial: false,
    status: billingStatus,
  });
}

function applyExchangeCloverCodeMock(accessToken: string, accessTokenExpiration: number, refreshToken: string, refreshTokenExpiration: number) {
  (CloverAPIs.exchangeCloverCode as jest.Mock).mockResolvedValue({
    access_token: accessToken,
    access_token_expiration: accessTokenExpiration,
    refresh_token: refreshToken,
    refresh_token_expiration: refreshTokenExpiration,
  });
}

describe('ExchangeCloverCodeUseCase', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    setEnvVars();
    await seedMerchantsRepository();
    applyBillingInfoMock('ACTIVE');
    applyExchangeCloverCodeMock(cloverJwtTokenString, accessTokenExpiration, refreshToken, refreshTokenExpiration);
  });

  it('should return a valid Clover merchant id and billing status', async () => {
    const useCase = new CloverTokenExchangeUseCase();
    const result = await useCase.execute('1234567890', 'https://www.example.com');
    expect(result).toBeDefined();
    expect(result.cloverMerchantId).toBe(cloverMerchantId);
    expect(result.billingStatus).toBe('ACTIVE');
  });

  describe('when billing status is INACTIVE', () => {
    beforeEach(() => {
      applyBillingInfoMock('INACTIVE');
    });

    it('should return a valid Clover API token with billing status INACTIVE', async () => {
      const useCase = new CloverTokenExchangeUseCase();
      const result = await useCase.execute('1234567890', 'https://www.example.com');
      expect(result).toBeDefined();
      expect(result.cloverMerchantId).toBe(cloverMerchantId);
      expect(result.billingStatus).toBe('INACTIVE');
    });
  });
});
