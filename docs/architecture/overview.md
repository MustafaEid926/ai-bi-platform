# Architecture
Gateway -> domain microservices. PostgreSQL is source of truth. MinIO stores raw/processed files. Parquet is analytics format; DuckDB is the planned execution engine behind AnalyticsAdapter. RabbitMQ handles durable async work. Redis is cache/transient state. Qdrant stores vectors. AI calls tools using validated structured plans; it never receives arbitrary SQL execution authority.
