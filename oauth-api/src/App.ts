/**
 * Application setup/wireup for OAuth API for Clover Reporter app
 *
 * @since app-skaffold--JP
 */
import express from "express";
import { json } from "body-parser";
import { getCloverAPITokenRouter } from './routes/GetCloverAPIToken';
import { exchangeCloverCodeRouter } from './routes/ExchangeCloverCode';
import { getCloverBillingInfoRouter } from './routes/GetCloverBillingInfo';
import { ReqErrorHandler as errHandler } from '@reporter/common';

const app = express();
app.set('trust proxy', true); // tell express to trust the proxy (since requests are coming via proxy with NGINX)
app.use(json());

app.use('/api/oauth', getCloverAPITokenRouter);
app.use('/api/oauth', exchangeCloverCodeRouter);
app.use('/api/oauth', getCloverBillingInfoRouter);

app.use(errHandler.prepareErrResp);

export { app as oAuthApp };
