/**
 * Integration tests for GetCloverAPITokenUseCase
 *
 * @since setup-tests--JP
 */
import { GetCloverAPITokenUseCase } from '../../../src/usecases/GetCloverAPITokenUseCase';
import { CloverAPIs } from '../../../src/lib/http/CloverAPIs';
import {
  seedMerchantsRepository,
  setEnvVars,
  accessToken,
  accessTokenExpiration,
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

const capturedExp = accessTokenExpiration;

describe('GetCloverAPITokenUseCase', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    setEnvVars();
    await seedMerchantsRepository();
    applyBillingInfoMock('ACTIVE');
  });

  it('should return a valid Clover API token', async () => {
    const useCase = new GetCloverAPITokenUseCase();
    const result = await useCase.execute('1234567890');
    expect(result).toBeDefined();
    expect(result.accessToken).toBe(accessToken);
    expect(result.expiresAt).toBe(capturedExp);
    expect(result.billingStatus).toBe('ACTIVE');
  });

  describe('when billing status is INACTIVE', () => {
    beforeEach(() => {
      applyBillingInfoMock('INACTIVE');
    });

    it('should return a valid Clover API token with billing status INACTIVE', async () => {
      const useCase = new GetCloverAPITokenUseCase();
      const result = await useCase.execute('1234567890');
      expect(result).toBeDefined();
      expect(result.accessToken).toBe(accessToken);
      expect(result.expiresAt).toBe(accessTokenExpiration);
      expect(result.billingStatus).toBe('INACTIVE');
    });
  });
});
