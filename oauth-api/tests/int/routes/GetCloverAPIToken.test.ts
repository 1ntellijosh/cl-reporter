/**
 * Tests for GetCloverAPIToken route
 *
 * @since tests-start--JP
 */
import request from 'supertest';
import { oAuthApp } from '../../../src/App';
import { OAuthService } from '../../../src/OAuthService';

const validMerchantId = '1234567890';

describe('get-clover-api-token route tests', () => {
  it('Returns a 200 with valid merchant id', async () => {
    // Mock OAuthService getCloverAPIToken to return a valid response
    jest.spyOn(OAuthService.prototype, 'getCloverAPIToken').mockResolvedValue({
      accessToken: 'valid-access-token',
      expiresAt: 1717334400,
      billingStatus: 'ACTIVE',
    });
    await request(oAuthApp)
      .post('/api/oauth/get-clover-api-token')
      .send({
        merchantId: validMerchantId,
      })
      .expect(200);
  });

  it('Returns a 400 with missing merchant id', async () => {
    await request(oAuthApp)
      .post('/api/oauth/get-clover-api-token')
      .send({})
      .expect(400);
  });

  it('Returns a 400 with empty merchant id', async () => {
    await request(oAuthApp)
      .post('/api/oauth/get-clover-api-token')
      .send({ merchantId: '' })
      .expect(400);
  });
});