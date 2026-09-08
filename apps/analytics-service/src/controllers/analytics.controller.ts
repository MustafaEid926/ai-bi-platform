import {
  Request,
  Response,
} from 'express';

import { analyticsQuerySchema } from '../schemas/analytics.schema.js';
import { AnalyticsService } from '../services/analytics.service.js';

export class AnalyticsController {
  constructor(
    private readonly analyticsService: AnalyticsService,
  ) {}

  query = async (
    req: Request,
    res: Response,
  ) => {
    const query =
      analyticsQuerySchema.parse(req.body);

    const organizationId =
      req.header('X-Organization-ID');

    if (!organizationId) {
      return res.status(400).json({
        error: {
          code: 'ORGANIZATION_ID_REQUIRED',
          message:
            'X-Organization-ID header is required',
        },
      });
    }

    const result =
      await this.analyticsService.executeQuery(
        query,
        organizationId,
      );

    res.json({
      data: result,
    });
  };

  getQuery = async (
    req: Request,
    res: Response,
  ) => {
    res.json({
      data: {
        id: req.params.id,
        status: 'COMPLETED',
      },
    });
  };
}
