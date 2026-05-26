import { init } from '@instantdb/admin';
import schema from './schema.js';
import { INSTANT_APP_ID, requiredEnv } from './instant-config.js';

const db = init({
  appId: INSTANT_APP_ID,
  adminToken: requiredEnv('INSTANT_APP_ADMIN_TOKEN'),
  schema,
});

export default db;
