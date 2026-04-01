/**
 * Clover Reporter event data contracts. Used so factories know the format of each event data payload, and so event
 * consumers can type-check against and read the data payload.
 *
 * @since app-skaffold--JP
 */

/********************************************
 * REPORT GENERATION SERVICE EVENT DATA CONTRACTS
 ********************************************/

/** Data payload for report.generate. */
export interface ReportGenerateData {
  reportDefinitionId: string;
}

/*******************************************
 * OAUTH SERVICE EVENT DATA CONTRACTS
 *******************************************/

/** Data payload for token.update-refresh-token. */
export interface TokenUpdateRefreshTokenData {
  merchantId: string;
  refreshToken: string;
}