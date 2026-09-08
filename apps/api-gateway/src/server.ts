import express from 'express';
import crypto from 'node:crypto';

import { errorHandler } from '@aibi/http';
import { requestContext } from '@aibi/observability';
import { logger } from '@aibi/logger';
import { connectBus } from '@aibi/messaging';

const app = express();

app.use(express.json({ limit: '10mb' }));
app.use(requestContext);

app.use((req, _res, next) => {
  console.log('GATEWAY REQUEST:', req.method, req.originalUrl);
  next();
});

app.get('/health', (req, res) =>
  res.json({
    status: 'ok',
    service: 'api-gateway',
  }),
);

app.get('/ready', (req, res) =>
  res.json({
    status: 'ready',
  }),
);

const targets: any = {
  'identity-service': 'http://identity-service:3001',
  'data-service': 'http://data-service:3002',
  'analytics-service': 'http://localhost:3003',
  'ai-service': 'http://ai-service:3004',
  'rag-service': 'http://rag-service:3005',
  'ml-service': 'http://ml-service:3006',
  'reporting-service': 'http://reporting-service:3007',
  'notification-service': 'http://notification-service:3008',
};

app.use('/api/v1', async (req, res, next) => {
  try {
    const p = req.path;

    let service: string | null =
      p.startsWith('/auth') ||
      p.startsWith('/organizations')
        ? 'identity-service'
        : p.startsWith('/datasets') ||
            p.startsWith('/processing-jobs')
          ? 'data-service'
          : p.startsWith('/analytics') ||
              p.startsWith('/kpis')
            ? 'analytics-service'
            : p.startsWith('/ai')
              ? 'ai-service'
              : p.startsWith('/documents')
                ? 'rag-service'
                : p.startsWith('/ml')
                  ? 'ml-service'
                  : p.startsWith('/reports')
                    ? 'reporting-service'
                    : p.startsWith('/notifications')
                      ? 'notification-service'
                      : null;

    if (!service) {
      return res.status(404).json({
        error: {
          code: 'ROUTE_NOT_FOUND',
          message: 'No gateway route',
        },
      });
    }

    const url =
      targets[service] +
      req.originalUrl.replace('/api/v1', '/api/v1');

    logger.info(
      {
        service,
        method: req.method,
        path: req.originalUrl,
        url,
      },
      'Gateway proxy request',
    );

    const headers: any = {
      'content-type': 'application/json',
      'x-request-id':
        req.header('x-request-id') ??
        crypto.randomUUID(),

      ...(req.header('authorization')
        ? {
            authorization:
              req.header('authorization'),
          }
        : {}),

      ...(req.header('x-organization-id')
        ? {
            'x-organization-id':
              req.header('x-organization-id'),
          }
        : {}),
    };

    const r = await fetch(url, {
      method: req.method,
      headers,
      body: ['GET', 'HEAD'].includes(req.method)
        ? undefined
        : JSON.stringify(req.body ?? {}),
    });

    logger.info(
      {
        service,
        url,
        status: r.status,
      },
      'Gateway proxy response',
    );

    const text = await r.text();

    res
      .status(r.status)
      .type(
        r.headers.get('content-type') ??
          'application/json',
      )
      .send(text);
  } catch (error) {
    logger.error(
      {
        error,
        method: req.method,
        path: req.originalUrl,
      },
      'Gateway proxy failed',
    );

    next(error);
  }
});

app.use(errorHandler);

connectBus().catch((error) => {
  logger.error(
    { error },
    'Failed to connect to messaging bus',
  );
});

app.listen(3000, () =>
  logger.info('api-gateway listening on 3000'),
);

