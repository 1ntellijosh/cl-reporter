/**
 * Schema for Clover Reporter app
 *
 * @since drizzle-the-db--JP
 */

import {
  bigint,
  boolean,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

/** Clover tenant — see docs/data-model.md */
export const merchants = pgTable('merchants', {
  id: uuid('id').primaryKey().defaultRandom(),
  cloverMerchantId: text('clover_merchant_id').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
    .notNull()
    .defaultNow(),
  /** Subscription / install entitlement — optional stub (PRD Appendix C) */
  subscriptionEntitlement: jsonb('subscription_entitlement'),
  accessTokenCiphertext: text('access_token_ciphertext'),
  refreshTokenCiphertext: text('refresh_token_ciphertext'),
  /** Clover-returned expiry (Unix seconds) */
  accessTokenExpiration: bigint('access_token_expiration', { mode: 'number' }),
  refreshTokenExpiration: bigint('refresh_token_expiration', { mode: 'number' }),
  needsReauth: boolean('needs_reauth').notNull().default(false),
  timezone: text('timezone'),
});

/** Saved wizard configuration per merchant */
export const reportDefinitions = pgTable('report_definitions', {
  id: uuid('id').primaryKey().defaultRandom(),
  merchantId: uuid('merchant_id')
    .notNull()
    .references(() => merchants.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  reportType: text('report_type').notNull(),
  definition: jsonb('definition').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
    .notNull()
    .defaultNow(),
});

/** One enqueue of a report build */
export const reportGenerationJobs = pgTable('report_generation_jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  merchantId: uuid('merchant_id')
    .notNull()
    .references(() => merchants.id, { onDelete: 'cascade' }),
  reportDefinitionId: uuid('report_definition_id')
    .notNull()
    .references(() => reportDefinitions.id, { onDelete: 'cascade' }),
  idempotencyKey: text('idempotency_key').notNull().unique(),
  status: text('status').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
    .notNull()
    .defaultNow(),
  startedAt: timestamp('started_at', { withTimezone: true, mode: 'date' }),
  completedAt: timestamp('completed_at', { withTimezone: true, mode: 'date' }),
  /**
   * Links to audit_events when status = failed. No DB FK (avoids circular FK with audit_events.related_job_id).
   */
  auditEventId: uuid('audit_event_id'),
});

/** Successful artifact metadata */
export const reportFiles = pgTable('report_files', {
  id: uuid('id').primaryKey().defaultRandom(),
  jobId: uuid('job_id')
    .notNull()
    .references(() => reportGenerationJobs.id, { onDelete: 'cascade' }),
  merchantId: uuid('merchant_id')
    .notNull()
    .references(() => merchants.id, { onDelete: 'cascade' }),
  storageKey: text('storage_key').notNull(),
  filename: text('filename').notNull(),
  sizeBytes: bigint('size_bytes', { mode: 'number' }).notNull(),
  contentType: text('content_type').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
    .notNull()
    .defaultNow(),
});

/** Ops / failure events */
export const auditEvents = pgTable('audit_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  merchantId: uuid('merchant_id')
    .notNull()
    .references(() => merchants.id, { onDelete: 'cascade' }),
  eventType: text('event_type').notNull(),
  summary: text('summary').notNull(),
  relatedJobId: uuid('related_job_id').references(() => reportGenerationJobs.id, {
    onDelete: 'set null',
  }),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
    .notNull()
    .defaultNow(),
});
