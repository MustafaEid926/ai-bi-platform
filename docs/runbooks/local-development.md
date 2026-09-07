# Local development

`cp .env.example .env` then `docker compose up --build`.

Reset: `docker compose down -v`.

Gateway health: `curl http://localhost:3000/health`.

Register through `POST http://localhost:3000/api/v1/auth/register`.
