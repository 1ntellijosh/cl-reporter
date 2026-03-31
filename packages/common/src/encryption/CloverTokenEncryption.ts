/**
 * Performs AES-256-GCM encryption for Clover OAuth tokens at rest (`merchants.access_token_ciphertext`,
 * `merchants.refresh_token_ciphertext`).
 *
 * Encryption wire format (binary, then Base64URL): `[version:1][iv:12][authTag:16][ciphertext]`.
 *
 * @since app-login--JP
 */
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;
const FORMAT_VERSION = 0x01;

/**
 * Parses `CLOVER_TOKEN_ENCRYPTION_KEY` material into a 32-byte AES-256 key.
 *
 * @param keyMaterial - UTF-8 string of exactly 32 bytes, or 64 hex characters (32 bytes).
 * @returns 32-byte key.
 * @throws Error if the key material is invalid.
 */
function parseEncryptionKey(keyMaterial: string | Buffer): Buffer {
  if (Buffer.isBuffer(keyMaterial)) {
    if (keyMaterial.length !== KEY_LENGTH) {
      throw new Error('Encryption key buffer must be 32 bytes');
    }

    return keyMaterial;
  }

  const trimmed = keyMaterial.trim();

  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    return Buffer.from(trimmed, 'hex');
  }

  const utf8 = Buffer.from(trimmed, 'utf8');

  if (utf8.length !== KEY_LENGTH) {
    throw new Error(
      `CLOVER_TOKEN_ENCRYPTION_KEY must be 32 UTF-8 bytes or 64 hex chars; got ${utf8.length} bytes`,
    );
  }

  return utf8;
}

/**
 * Encrypts a single token string for persistence (e.g. Clover `access_token` or `refresh_token`).
 *
 * @param plaintext - Raw token; do not log.
 * @param keyMaterial - Same rules as {@link parseEncryptionKey}.
 * @returns Base64URL-safe ciphertext safe for `text` columns.
 * @throws Error if plaintext is empty or key is invalid.
 */
export function encryptCloverToken(plaintext: string, keyMaterial: string | Buffer): string {
  if (!plaintext) {
    throw new Error('Cannot encrypt empty token');
  }

  const key = parseEncryptionKey(keyMaterial);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  const packed = Buffer.concat([
    Buffer.from([FORMAT_VERSION]),
    iv,
    authTag,
    ciphertext,
  ]);

  return packed.toString('base64url');
}

/**
 * Decrypts a value produced by {@link encryptCloverToken}.
 *
 * @param ciphertext - Base64URL string from the database.
 * @param keyMaterial - Same rules as {@link parseEncryptionKey}.
 * @returns Original token; do not log.
 * @throws Error if ciphertext is malformed or authentication fails.
 */
export function decryptCloverToken(ciphertext: string, keyMaterial: string | Buffer): string {
  if (!ciphertext) {
    throw new Error('Cannot decrypt empty ciphertext');
  }

  const key = parseEncryptionKey(keyMaterial);
  let packed: Buffer;

  try {
    packed = Buffer.from(ciphertext, 'base64url');
  } catch {
    throw new Error('Invalid ciphertext encoding');
  }

  if (packed.length < 1 + IV_LENGTH + TAG_LENGTH + 1) {
    throw new Error('Ciphertext too short');
  }

  const version = packed[0];

  if (version !== FORMAT_VERSION) {
    throw new Error(`Unsupported cipher format version: ${version}`);
  }

  const iv = packed.subarray(1, 1 + IV_LENGTH);
  const authTag = packed.subarray(1 + IV_LENGTH, 1 + IV_LENGTH + TAG_LENGTH);
  const enc = packed.subarray(1 + IV_LENGTH + TAG_LENGTH);
  const decipher = createDecipheriv(ALGORITHM, key, iv);

  decipher.setAuthTag(authTag);

  const plain = Buffer.concat([decipher.update(enc), decipher.final()]);

  return plain.toString('utf8');
}
