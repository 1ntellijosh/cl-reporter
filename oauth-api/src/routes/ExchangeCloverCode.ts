/**
 * Exchange Clover code routes for OAuth API for Clover Reporter app
 *
 * @since app-login--JP
 */
import express, { Request, Response } from "express";
import { RequestHandler as api } from '@reporter/common';
import { body } from 'express-validator';
import { OAuthService } from '../OAuthService';
import { STATUS_CODES } from '@reporter/common';

const router = express.Router();
const oAuthSvc = new OAuthService();

/**
 * Exchanges a Clover authorization code for a Clover API tokens
 *
 * @param {object} body  The body of the request
 *   @prop {string} code  The code to exchange
 *   @prop {string} redirectUri  The redirect URI
 *
 * @returns {Promise<Response>}
 */
router.post('/exchange-clover-code',
  [ 
    body('code').trim().notEmpty().withMessage('Code is required'),
    body('redirectUri').trim().notEmpty().withMessage('Redirect URI is required'),
  ],
  api.validateRequest,
  api.callAsync(async (req: Request, res: Response) => {
    const { code, redirectUri } = req.body;
    const response = await oAuthSvc.onExchangeCloverCode(code, redirectUri);
    
    res.status(STATUS_CODES.SUCCESS).json(response);
  })
);

export { router as exchangeCloverCodeRouter };