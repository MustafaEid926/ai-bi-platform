import crypto from 'node:crypto';
import express from 'express';

import { errorHandler } from '@aibi/http';
import { logger } from '@aibi/logger';
import { connectBus } from '@aibi/messaging';
import { requestContext } from '@aibi/observability';

import { analyticsQuerySchema } from './schemas/analytics-query.schema.js';
import { AnalyticsPlanner } from './services/planner.js';
import { LlmClient } from './services/llm-client.js';

import { buildAnswerPrompt } from './services/answer-prompt.js';
import { StructuredAnalyticsPlanner } from './services/structured-planner.js';

const app = express();

app.use(express.json({ limit: '10mb' }));
app.use(requestContext);

const ANALYTICS_SERVICE_URL =
  process.env.ANALYTICS_SERVICE_URL ?? 'http://analytics-service:3003';

const planner = new AnalyticsPlanner();

const llmClient = new LlmClient();

const structuredPlanner = new StructuredAnalyticsPlanner(llmClient);

async function executeAnalyticsQuery(
  query: ReturnType<typeof analyticsQuerySchema.parse>,
  organizationId: string,
) {
  const validatedQuery = analyticsQuerySchema.parse(query);

  const response = await fetch(
    `${ANALYTICS_SERVICE_URL}/api/v1/analytics/query`,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'X-Organization-ID': organizationId,
      },
      body: JSON.stringify(validatedQuery),
    },
  );

  const body = await response.json();

  if (!response.ok) {
    throw new Error(
      body?.error?.message ??
        `Analytics Service request failed: ${response.status}`,
    );
  }

  return body.data;
}

app.get('/health', (req, res) =>
  res.json({
    status: 'ok',
    service: 'ai-service',
  }),
);

app.get('/ready', (req, res) =>
  res.json({
    status: 'ready',
  }),
);

app.post('/api/v1/ai/query', async (req, res, next) => {
  
  try {
    const question = String(req.body?.question ?? '');
    const organizationId = req.header('X-Organization-ID');

    if (!organizationId) {
      return res.status(400).json({
        error: {
          code: 'ORGANIZATION_ID_REQUIRED',
          message: 'X-Organization-ID header is required',
        },
      });
    }

    const datasetId = String(req.body?.datasetId ?? '');
    const versionId = String(req.body?.versionId ?? '');

    if (!datasetId || !versionId) {
      return res.status(400).json({
        error: {
          code: 'DATASET_CONTEXT_REQUIRED',
          message: 'datasetId and versionId are required',
        },
      });
    }

    if (!question.trim()) {
      return res.status(400).json({
        error: {
          code: 'QUESTION_REQUIRED',
          message: 'question is required',
        },
      });
    }

    let query;

    try {
        query = await structuredPlanner.plan({
            question,
            datasetId,
            versionId,
    });
    } catch (error) {
        logger.warn(
            {
            error,
            },
            'Structured planner failed, falling back to deterministic planner',
    );

    query = planner.plan({
        question,
        datasetId,
        versionId,
    });
    }

    const analyticsResult = await executeAnalyticsQuery(
      query,
      organizationId,
    );

    const answerPrompt = buildAnswerPrompt({
        question,
        analyticsResult,
    });

    const llmResult = await llmClient.generate({
        prompt: answerPrompt,
        max_new_tokens: 250,
    });

    return res.json({
        data: {
            request_id: crypto.randomUUID(),
            question,
            plan: query,
            answer: llmResult.answer,
            analytics_result: analyticsResult,
            execution_mode: 'SYNC',
            tools_used: ['AnalyticsTool', 'LLM'],
            status: 'COMPLETED',
        },
    });
    } catch (error) {
        
        next(error);
    }
});
app.post('/api/v1/ai/analyst', (req, res) =>
  res.status(202).json({
    data: {
      job_id: crypto.randomUUID(),
      status: 'QUEUED',
      question: req.body?.question,
    },
  }),
);

app.use(errorHandler);

connectBus().catch(() => {});

app.listen(3004, () => logger.info('ai-service listening on 3004'));