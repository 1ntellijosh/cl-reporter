/**
 * Get Clover billing info routes for OAuth API for Clover Reporter app
 *
 * @since app-login--JP
 */
import express, { Request, Response } from "express";
import { RequestHandler as api } from '@reporter/common';
import { OAuthService } from '../OAuthService';
import { STATUS_CODES } from '@reporter/common';

const router = express.Router();
const oAuthSvc = new OAuthService();

/**
 * Gets Clover billing info for a given merchant
 *
 * @returns {Promise<Response>}
 */
router.get('/get-clover-billing-info',
  api.validateRequest,
  api.callAsync(async (req: Request, res: Response) => {
    // Extract the merchant ID from the user payload
    const merchantId = api.getCurrentUser(req)?.cloverMerchantId;

    // If the user is not logged in, return null for billing status
    if (!merchantId) {
      res.status(STATUS_CODES.SUCCESS).json({ billingStatus: null });

      return;
    }

    // Get the billing status for the logged in merchant
    const response = await oAuthSvc.getCloverBillingInfo(merchantId);
    
    res.status(STATUS_CODES.SUCCESS).json(response);
  })
);

export { router as getCloverBillingInfoRouter };