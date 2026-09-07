export const env = {
 nodeEnv: process.env.NODE_ENV ?? 'development', jwtSecret: process.env.JWT_SECRET ?? 'dev-secret',
 accessTtl: process.env.ACCESS_TOKEN_TTL ?? '15m', refreshDays: Number(process.env.REFRESH_TOKEN_TTL_DAYS ?? 30),
 postgres:{host:process.env.POSTGRES_HOST??'localhost',port:Number(process.env.POSTGRES_PORT??5432),db:process.env.POSTGRES_DB??'aibi',user:process.env.POSTGRES_USER??'aibi',password:process.env.POSTGRES_PASSWORD??'aibi'},
 rabbitmq:process.env.RABBITMQ_URL??'amqp://aibi:aibi@localhost:5672', redis:process.env.REDIS_URL??'redis://localhost:6379',
 minio:{endpoint:process.env.MINIO_ENDPOINT??'localhost',port:Number(process.env.MINIO_PORT??9000),accessKey:process.env.MINIO_ACCESS_KEY??'minioadmin',secretKey:process.env.MINIO_SECRET_KEY??'minioadmin',bucket:process.env.MINIO_BUCKET??'business-data'},
 qdrantUrl:process.env.QDRANT_URL??'http://localhost:6333', llmBaseUrl:process.env.LLM_BASE_URL??'', llmApiKey:process.env.LLM_API_KEY??'', llmModel:process.env.LLM_MODEL??'open-source-model'
};
