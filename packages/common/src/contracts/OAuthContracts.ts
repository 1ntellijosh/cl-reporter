/**
 * Server-to-server OAuth request/response contracts for Clover token exchange and token retrieval.
 *
 * @since app-login--JP
 */

/**
 * Response from Clover `/oauth/v2/token` endpoint when exchanging a Clover authorization code in authorization flow.
 */
export interface CloverTokenResponse {
  access_token: string;
  access_token_expiration: number;
  refresh_token: string;
  refresh_token_expiration: number;
};

/**
 * Response after a successful code exchange and merchant upsert in database.
 */
export interface OAuthExchangeCodeResponse {
  // Clover merchant id (`mId`).
  cloverMerchantId: string;
  // Billing status
  billingStatus: 'ACTIVE' | 'INACTIVE' | 'TRIAL';
}

/**
 * Result of resolving a valid Clover access token for API calls.
 * !!! Never log `accessToken` or include it in client-visible errors.
 */
export interface GetValidCloverTokenResponse {
  // Bearer token for `Authorization: Bearer …` against Clover REST. Do not log.
  accessToken: string | null;
  // Unix timestamp in seconds when the access token expires, if known.
  expiresAt?: number;
  // Billing status
  billingStatus: 'ACTIVE' | 'INACTIVE' | 'TRIAL';
}

/**
 * Response from Clover `/v3/apps/{appId}/merchants/{mId}/billing_info` endpoint.
 */
export interface CloverBillingInfoResponse {
  id: string;
  appSubscription: {
    id: string;
    name: string;
    amount: number;
    description: string;
    active: boolean;
    plan: boolean;
    subscriptionCountries: [
      {
        id: string;
      }
    ],
    app: {
      id: string;
    },
    label: string;
  },
  isInTrial: boolean;
  billable: boolean;
  appBillable: boolean;
  planBillable: boolean;
  appExportable: boolean;
  planExportable: boolean;
  billingStartTime: number;
  status: string;
  daysLapsed: number;
};

/**
 * Response from Clover `/v3/apps/{appId}/merchants/{mId}/billing_info` endpoint.
 */
export interface OAuthBillingStatusResponse {
  billingStatus: 'ACTIVE' | 'INACTIVE' | 'TRIAL' | null;
}
