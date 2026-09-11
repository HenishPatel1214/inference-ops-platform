# API

All `/api/*` and `/v1/*` endpoints require `Authorization: Bearer dev-token` by default. Health and metrics endpoints are unauthenticated.

## Real chat completions

`POST /v1/chat/completions` accepts a non-streaming OpenAI-compatible request and forwards it to the runtime configured by `INFERENCE_UPSTREAM_URL`. The response includes an `x-inference-request-id` header that identifies the persisted telemetry row.

```bash
curl http://localhost:8000/v1/chat/completions \
  -H "Authorization: Bearer dev-token" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gemma3:4b",
    "messages": [{"role": "user", "content": "Explain a Kubernetes readiness probe."}]
  }'
```

Successful requests persist latency and upstream token usage. Timeouts and connection or upstream errors also create failure rows and events. Streaming requests currently return `400` and are planned as a separate slice.

## Health

```bash
curl http://localhost:8000/health
curl http://localhost:8000/ready
```

## Nodes

```bash
curl -H "Authorization: Bearer dev-token" http://localhost:8000/api/nodes
curl -X POST http://localhost:8000/api/nodes \
  -H "Authorization: Bearer dev-token" \
  -H "Content-Type: application/json" \
  -d '{"name":"worker-a100-01","region":"us-west","gpu_type":"A100","capacity_rps":45,"current_load":0}'
```

## Deployments

```bash
curl -H "Authorization: Bearer dev-token" http://localhost:8000/api/deployments
curl -X POST http://localhost:8000/api/deployments \
  -H "Authorization: Bearer dev-token" \
  -H "Content-Type: application/json" \
  -d '{"model_name":"llama-3.1-8b","model_version":"demo","runtime":"vllm","replicas":1,"node_id":1}'
```

## Analytics

```bash
curl -H "Authorization: Bearer dev-token" http://localhost:8000/api/analytics/overview
curl -H "Authorization: Bearer dev-token" http://localhost:8000/api/analytics/latency
```

## Events

```bash
curl -H "Authorization: Bearer dev-token" http://localhost:8000/api/events
curl -X POST http://localhost:8000/api/events \
  -H "Authorization: Bearer dev-token" \
  -H "Content-Type: application/json" \
  -d '{"event_type":"node.heartbeat","severity":"info","message":"heartbeat accepted","payload":{"node":"worker-a100-01"}}'
```

## WebSocket

Connect to:

```text
ws://localhost:8000/ws/events?token=dev-token
```

On connect, the backend attempts to replay recent Redis Stream entries, then pushes newly published events as JSON.
