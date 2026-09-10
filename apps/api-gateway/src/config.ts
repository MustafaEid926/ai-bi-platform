export const gatewayConfig = {
  services: {
    identity:
      process.env.IDENTITY_SERVICE_URL ??
      'http://localhost:3001',

    data:
      process.env.DATA_SERVICE_URL ??
      'http://localhost:3002',

    analytics:
      process.env.ANALYTICS_SERVICE_URL ??
      'http://localhost:3003',

    ai:
      process.env.AI_SERVICE_URL ??
      'http://localhost:3004',

    rag:
      process.env.RAG_SERVICE_URL ??
      'http://localhost:3005',

    ml:
      process.env.ML_SERVICE_URL ??
      'http://localhost:3006',

    reporting:
      process.env.REPORTING_SERVICE_URL ??
      'http://localhost:3007',

    notification:
      process.env.NOTIFICATION_SERVICE_URL ??
      'http://localhost:3008',
  },
};