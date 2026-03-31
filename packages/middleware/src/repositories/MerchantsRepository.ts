/**
 * Repository for merchants table
 *
 * @since app-login--JP
 */
import { db } from '../drizzle-orm/DbConnectModule';
import { merchants } from '../drizzle-orm/schema';
import { encryptCloverToken, decryptCloverToken } from '@reporter/common';
import { eq } from 'drizzle-orm';

export class MerchantsRepository {
  /**
   * Persists encrypted refresh token + expiry for a Clover merchant (insert or update on `clover_merchant_id`).
   *
   * @param cloverMerchantId
   * @param refreshToken
   * @param refreshTokenExpiration
   *
   * @returns {Promise<void>}
   */
  static async storeRefreshTokenData(
    cloverMerchantId: string,
    refreshToken: string,
    refreshTokenExpiration: number,
  ): Promise<void> {
    const key = process.env.CLOVER_TOKEN_ENCRYPTION_KEY;

    if (!key?.trim()) {
      throw new Error('CLOVER_TOKEN_ENCRYPTION_KEY is not set');
    }

    const refreshTokenCiphertext = encryptCloverToken(refreshToken, key);
    const now = new Date();

    await db
      .insert(merchants)
      .values({
        cloverMerchantId,
        refreshTokenCiphertext,
        refreshTokenExpiration,
        updatedAt: now,
        needsReauth: false,
      })
      .onConflictDoUpdate({
        target: merchants.cloverMerchantId,
        set: {
          refreshTokenCiphertext,
          refreshTokenExpiration,
          updatedAt: now,
          needsReauth: false,
        },
      });
  }

  /**
   * Persists encrypted access token + expiry for a Clover merchant (insert or update on `clover_merchant_id`).
   *
   * @param cloverMerchantId
   * @param accessToken
   * @param accessTokenExpiration
   *
   * @returns {Promise<void>}
   */
  static async storeAccessTokenData(
    cloverMerchantId: string,
    accessToken: string,
    accessTokenExpiration: number,
  ): Promise<void> {
    const key = process.env.CLOVER_TOKEN_ENCRYPTION_KEY;

    if (!key?.trim()) {
      throw new Error('CLOVER_TOKEN_ENCRYPTION_KEY is not set');
    }

    const accessTokenCiphertext = encryptCloverToken(accessToken, key);
    const now = new Date();

    await db
      .insert(merchants)
      .values({
        cloverMerchantId,
        accessTokenCiphertext,
        accessTokenExpiration,
        updatedAt: now,
        needsReauth: false,
      })
      .onConflictDoUpdate({
        target: merchants.cloverMerchantId,
        set: {
          accessTokenCiphertext,
          accessTokenExpiration,
          updatedAt: now,
          needsReauth: false,
        },
      });
  }

  /**
   * Sets the needs_reauth flag to true for a Clover merchant
   *
   * @param cloverMerchantId
   *
   * @returns {Promise<void>}
   */
  static async setNeedsReauth(cloverMerchantId: string): Promise<void> {
    await db
      .update(merchants)
      .set({ needsReauth: true })
      .where(eq(merchants.cloverMerchantId, cloverMerchantId));
  }

  /**
   * Gets the access token for a given merchant
   *
   * @param merchantId
   *
   * @returns {Promise<string | null>}
   */
  static async getAccessToken(merchantId: string): Promise<{ accessToken: string, accessTokenExpiration: number } | null> {
    const result = await db.select().from(merchants).where(eq(merchants.cloverMerchantId, merchantId)).limit(1);

    if (!result || !result[0]?.accessTokenCiphertext) return null;
    
    const key = process.env.CLOVER_TOKEN_ENCRYPTION_KEY;

    if (!key?.trim()) {
      throw new Error('CLOVER_TOKEN_ENCRYPTION_KEY is not set');
    }

    return {
      accessToken: decryptCloverToken(result[0].accessTokenCiphertext, key),
      accessTokenExpiration: result[0].accessTokenExpiration!,
    };
  }

  /**
   * Gets the access token for a given merchant
   *
   * @param merchantId
   *
   * @returns {Promise<string | null>}
   */
  static async getRefreshToken(merchantId: string): Promise<{ refreshToken: string, refreshTokenExpiration: number } | null> {
    const result = await db.select().from(merchants).where(eq(merchants.cloverMerchantId, merchantId)).limit(1);

    if (!result || !result[0]?.refreshTokenCiphertext) return null;
    
    const key = process.env.CLOVER_TOKEN_ENCRYPTION_KEY;

    if (!key?.trim()) {
      throw new Error('CLOVER_TOKEN_ENCRYPTION_KEY is not set');
    }

    return {
      refreshToken: decryptCloverToken(result[0].refreshTokenCiphertext, key),
      refreshTokenExpiration: result[0].refreshTokenExpiration!,
    };
  }
}