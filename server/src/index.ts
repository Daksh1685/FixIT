import 'dotenv/config';

import { createApp } from './app.js';
import { env } from './config/env.js';

const app = createApp();

app.listen(env.port, () => {
  console.info(`SnapFix API listening on http://localhost:${env.port}`);
});
