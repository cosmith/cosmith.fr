import { init } from '@instantdb/core';
import schema from './schema.js';

const APP_ID = 'de6141d2-6507-48c1-981e-9ba2c71ccc6d';

const db = init({
  appId: APP_ID,
  schema
});

export default db;