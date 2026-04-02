/**
 * Unit tests for SessionModule
 *
 * @since app-login--JP
 */
import { beforeEach, describe, expect, it } from '@jest/globals';
import { APP_BILLING_STATUS_COOKIE_NAME, APP_SESSION_ACCESS_COOKIE_NAME } from '@reporter/common';
import { cookieStoreMocks } from '../mocks/next-headers';
import { SessionModule } from '../../src/lib/sessions/SessionModule';

describe('SessionModule', () => {
  beforeEach(() => {
    cookieStoreMocks.get.mockClear();
    cookieStoreMocks.set.mockClear();
    cookieStoreMocks.delete.mockClear();
  });

  it('should be defined', () => {
    expect(SessionModule).toBeDefined();
  });

  it('should set the app session cookie', async () => {
    const token = 'test-token';
    await SessionModule.setAppSessionCookie(token);

    expect(cookieStoreMocks.set).toHaveBeenCalledTimes(1);
    expect(cookieStoreMocks.set).toHaveBeenCalledWith(
      APP_SESSION_ACCESS_COOKIE_NAME,
      token,
      expect.objectContaining({
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: expect.any(Number),
      }),
    );
  });

  it('should set the billing status cookie', async () => {
    const billingStatus = 'test-billing-status';
    await SessionModule.setBillingStatusCookie(billingStatus);

    expect(cookieStoreMocks.set).toHaveBeenCalledTimes(1);
    expect(cookieStoreMocks.set).toHaveBeenCalledWith(
      APP_BILLING_STATUS_COOKIE_NAME,
      billingStatus,
      expect.objectContaining({
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: expect.any(Number),
      }),
    );
  });

  it('should clear the app session', async () => {
    await SessionModule.clearAppSession();

    expect(cookieStoreMocks.delete).toHaveBeenCalledTimes(2);
    expect(cookieStoreMocks.delete).toHaveBeenCalledWith({ name: APP_SESSION_ACCESS_COOKIE_NAME, path: '/' });
    expect(cookieStoreMocks.delete).toHaveBeenCalledWith({ name:APP_BILLING_STATUS_COOKIE_NAME, path: '/' });
  });

  it('should extract payload from bearer jwt', () => {
    const payload = SessionModule.extractPayloadFromBearerJwt('Bearer test-token');
    expect(payload).toBeDefined();
  });

  it('should get app session payload', async () => {
    const payload = await SessionModule.getAppSessionPayload();
    expect(payload).toBeDefined();
  });
});
