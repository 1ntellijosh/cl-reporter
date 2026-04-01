/**
 * Tests for ExchangeCloverCode route
 *
 * @since tests-start--JP
 */
import request from 'supertest';
import { oAuthApp } from '../../../src/App';
import { OAuthService } from '../../../src/OAuthService';

const validMerchantId = '1234567890';
const validCode = '1234567890';
const validRedirectUri = 'https://www.example.com';

describe('exchange-clover-code route tests', () => {
  it('Returns a 200 with valid merchant id', async () => {
    jest.spyOn(OAuthService.prototype, 'onExchangeCloverCode').mockResolvedValue({
      cloverMerchantId: validMerchantId,
      billingStatus: 'ACTIVE',
    });
    await request(oAuthApp)
      .post('/api/oauth/exchange-clover-code')
      .send({
        code: validCode,
        redirectUri: validRedirectUri,
      })
      .expect(200);
  });

  it('Returns a 400 with missing code', async () => {
    await request(oAuthApp)
      .post('/api/oauth/exchange-clover-code')
      .send({
        redirectUri: validRedirectUri,
      })
      .expect(400);
  });

  it('Returns a 400 with empty code', async () => {
    await request(oAuthApp)
      .post('/api/oauth/exchange-clover-code')
      .send({
        code: '',
        redirectUri: validRedirectUri,
      })
      .expect(400);
  });

  it('Returns a 400 with missing redirect uri', async () => {
    await request(oAuthApp)
      .post('/api/oauth/exchange-clover-code')
      .send({
        code: validCode,
      })
      .expect(400);
  });

  it('Returns a 400 with empty redirect uri', async () => {
    await request(oAuthApp)
      .post('/api/oauth/exchange-clover-code')
      .send({
        code: validCode,
        redirectUri: '',
      })
      .expect(400);
  });
});