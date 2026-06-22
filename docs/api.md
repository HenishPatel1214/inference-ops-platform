# API

All `/api/*` endpoints require `Authorization: Bearer dev-token` by default. Health and metrics endpoints are unauthenticated.

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
