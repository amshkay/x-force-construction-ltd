/**
 * Vercel Serverless Function Entrypoint
 *
 * Directs /api/* requests to the Express application handlers
 * (health check, AI proxy, persistent media upload/delete/list).
 */

import app from '../server';

export default app;
