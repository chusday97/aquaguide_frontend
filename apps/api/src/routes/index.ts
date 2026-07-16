import { Router } from 'express';
import { isBusinessDatabaseConfigured } from '../config';
import { sendData } from '../http';
import { contentRouter } from './content';

export const v1Router = Router();

v1Router.get('/business-health', (request, response) => sendData(request, response, {
  ok: true,
  databaseConfigured: isBusinessDatabaseConfigured(),
  architecture: 'web-api-supabase',
}));

v1Router.use(contentRouter);
