import { app } from './app.js';
import { assertSafeConfiguration, config } from './config.js';
assertSafeConfiguration();
app.listen(config.port, '127.0.0.1', () => console.log(`PBL development API: http://127.0.0.1:${config.port}`));
