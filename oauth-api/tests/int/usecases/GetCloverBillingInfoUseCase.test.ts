/**
 * Integration tests for GetCloverBillingInfoUseCase
 *
 * @since setup-tests--JP
 */
import { CloverBillingInfoUseCase } from '../../../src/usecases/CloverBillingInfoUseCase';
import { CloverAPIs } from '../../../src/lib/http/CloverAPIs';
import {
  seedMerchantsRepository,
  setEnvVars,
  accessToken,
  accessTokenExpiration,
  cloverMerchantId,
} from '../IntegrationTestHelpers';

jest.mock('../../../src/lib/http/CloverAPIs', () => ({
  CloverAPIs: {
    getCloverBillingInfo: jest.fn(),
  },
}));

function applyBillingInfoMock(billingStatus: 'ACTIVE' | 'INACTIVE') {
  (CloverAPIs.getCloverBillingInfo as jest.Mock).mockResolvedValue({
    isInTrial: false,
    status: billingStatus,
  });
}

describe('GetCloverBillingInfoUseCase', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    setEnvVars();
    await seedMerchantsRepository();
    applyBillingInfoMock('ACTIVE');
  });

  it('should return a valid Clover API token', async () => {
    const useCase = new CloverBillingInfoUseCase();
    const result = await useCase.execute(cloverMerchantId);
    expect(result).toBeDefined();
    expect(result.billingStatus).toBe('ACTIVE');
  });

  describe('when billing status is INACTIVE', () => {
    beforeEach(() => {
      applyBillingInfoMock('INACTIVE');
    });

    it('should return a valid Clover API token with billing status INACTIVE', async () => {
      const useCase = new CloverBillingInfoUseCase();
      const result = await useCase.execute(cloverMerchantId);
      expect(result).toBeDefined();
      expect(result.billingStatus).toBe('INACTIVE');
    });
  });
});
