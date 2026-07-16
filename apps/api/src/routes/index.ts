import { Router } from 'express';
import { isBusinessDatabaseConfigured } from '../config';
import { sendData } from '../http';
import { contentRouter } from './content';
import { aquariumsRouter } from './aquariums';
import { userRecordsRouter } from './user-records';
import { adminRouter } from './admin';
import { profileRouter } from './profile';

export const v1Router = Router();

v1Router.get('/business-health', (request, response) => sendData(request, response, {
  ok: true,
  databaseConfigured: isBusinessDatabaseConfigured(),
  architecture: 'web-api-supabase',
}));

v1Router.use(contentRouter);
v1Router.use(profileRouter);
v1Router.use(aquariumsRouter);
v1Router.use(userRecordsRouter);
v1Router.use('/admin', adminRouter);
