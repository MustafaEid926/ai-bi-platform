# Service contracts
Public API is versioned under `/api/v1`. Async creation returns `202`. Every response should expose `request_id`; errors use `{error:{code,message,details,request_id}}`. Internal endpoints are under `/internal/v1` and must not be exposed by the gateway.
