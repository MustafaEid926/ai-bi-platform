import express, { type Application } from 'express';

import { errorHandler } from '@aibi/http';
import { requestContext } from '@aibi/observability';

import { analyticsRouter } from './routes/analytics.routes.js';

const app: Application = express();

app.use(express.json({ limit: '10mb' }));

app.use(requestContext);

app.get('/health', (_req, res) => {
    res.json({
        status: 'ok',
        service: 'analytics-service',
    });
});

app.get('/ready', (_req, res) => {
    res.json({
        status: 'ready',
    });
});

app.use('/api/v1/analytics', analyticsRouter);

app.use(errorHandler);

export { app };