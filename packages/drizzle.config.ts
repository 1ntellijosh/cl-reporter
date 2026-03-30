/**
 * Drizzle configuration for Clover Reporter app
 *
 * @since drizzle-the-db--JP
 */

import { defineConfig } from 'drizzle-kit';

/** Migration SQL under ops/database/migrations (relative to this file in packages/). */
export default defineConfig({
  schema: './src/drizzle-orm/schema.ts',
  out: '../ops/database/migrations',
  dialect: 'postgresql',
});
