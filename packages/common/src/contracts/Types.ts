/**
 * Shared types for Clover Reporter app
 *
 * @since app-skaffold--JP
 */

/**
 * Billing status which gatekeeps access to pages and features in the app
 */
export type BillingStatus = 'ACTIVE' | 'INACTIVE' | 'TRIAL' | null;