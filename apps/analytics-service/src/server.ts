import { app } from './app.js';

import { logger } from '@aibi/logger';
import { connectBus } from '@aibi/messaging';

connectBus().catch((error) => {
  logger.error(
    { error },
    'Failed to connect to messaging bus',
  );
});

app.listen(3003, () => {
  logger.info(
    'analytics-service listening on 3003',
  );
});