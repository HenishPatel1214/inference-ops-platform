def test_create_node_and_deployment(client, auth_headers):
    node_response = client.post(
        "/api/nodes",
        headers=auth_headers,
        json={
            "name": "worker-test-01",
            "region": "local",
            "gpu_type": "L4",
            "capacity_rps": 20,
            "current_load": 0,
        },
    )
    assert node_response.status_code == 201
    node = node_response.json()
    assert node["name"] == "worker-test-01"

    deployment_response = client.post(
        "/api/deployments",
        headers=auth_headers,
        json={
            "model_name": "llama-test",
            "model_version": "1",
            "runtime": "vllm",
            "replicas": 1,
            "node_id": node["id"],
        },
    )
    assert deployment_response.status_code == 201
    deployment = deployment_response.json()
    assert deployment["model_name"] == "llama-test"
    assert deployment["node_id"] == node["id"]


def test_requires_token(client):
    response = client.get("/api/nodes")

    assert response.status_code == 401
