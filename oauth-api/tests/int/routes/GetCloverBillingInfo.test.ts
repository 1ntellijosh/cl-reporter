/**
 * Tests for GetCloverBillingInfo route
 *
 * @since tests-start--JP
 */
import request from 'supertest';
import { oAuthApp } from '../../../src/App';
import { OAuthService } from '../../../src/OAuthService';
import { signAppSessionAccessToken } from '@reporter/common';
import { JWT_SIGNING_KEY, cloverMerchantId } from '../IntegrationTestHelpers';

const appSessToken = signAppSessionAccessToken(JWT_SIGNING_KEY, cloverMerchantId);

describe('get-clover-billing-info route tests', () => {
  it('Returns a 200 with valid merchant id', async () => {
    // Mock OAuthService getCloverAPIToken to return a valid response
    jest.spyOn(OAuthService.prototype, 'getCloverBillingInfo').mockResolvedValue({
      billingStatus: 'ACTIVE',
    });
    
    await request(oAuthApp)
      .get('/api/oauth/get-clover-billing-info')
      .set('Authorization', `Bearer ${appSessToken}`)
      .expect(200);
  });

  it('Returns a 200 with null billing status when there\'s no session in request', async () => {
    const response = await request(oAuthApp)
      .get('/api/oauth/get-clover-billing-info')
      .expect(200);
    expect(response.body.billingStatus).toBeNull();
  });
});
