/**
 * Get Clover token routes for OAuth API for Clover Reporter app
 *
 * @since app-skaffold--JP
 */
import express, { Request, Response } from "express";
import { APIRequest as api } from '@reporter/core';
import { body } from 'express-validator';
import { OAuthService } from '../OAuthService';
import { STATUS_CODES } from '@reporter/core';

const router = express.Router();
const oAuthSvc = new OAuthService();

router.post('/get-clover-api-token',
  [ 
    body('merchantId').trim().notEmpty().withMessage('Merchant ID is required'),
  ],
  api.validateRequest,
  api.callAsync(async (req: Request, res: Response) => {})
);

export { router as getCloverAPITokenRouter };