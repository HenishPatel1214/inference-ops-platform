# API

All `/api/*` and `/v1/*` endpoints require `Authorization: Bearer dev-token` by default. Health and metrics endpoints are unauthenticated.

## Real chat completions

`POST /v1/chat/completions` accepts buffered or streaming OpenAI-compatible requests and forwards them to the runtime configured by `INFERENCE_UPSTREAM_URL`. The response includes an `x-inference-request-id` header that identifies the persisted telemetry row.

```bash
curl http://localhost:8000/v1/chat/completions \
  -H "Authorization: Bearer dev-token" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gemma3:4b",
    "messages": [{"role": "user", "content": "Explain a Kubernetes readiness probe."}],
    "stream": true
  }'
```

Streaming responses use `text/event-stream` and preserve the upstream `data:` frames. The gateway requests a final usage frame so it can persist prompt/completion tokens and calculate output throughput as completion tokens divided by generation time after the first token. It also records end-to-end latency, time to first token, requested and resolved model names, and any matching deployment/node IDs. An upstream interruption emits a final error data frame and stores a failed request; connection errors before headers retain their normal HTTP error status.

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
