def test_simulation_populates_analytics(client, auth_headers):
    simulate_response = client.post("/api/traffic/simulate?count=15", headers=auth_headers)
    assert simulate_response.status_code == 200
    benchmark = simulate_response.json()
    assert benchmark["requests"] == 15
    assert benchmark["p95_ms"] > 0

    overview_response = client.get("/api/analytics/overview", headers=auth_headers)
    assert overview_response.status_code == 200
    overview = overview_response.json()
    assert overview["nodes_total"] >= 1
    assert overview["deployments_active"] >= 1
    assert overview["requests_total"] == 15

    latency_response = client.get("/api/analytics/latency", headers=auth_headers)
    assert latency_response.status_code == 200
    assert latency_response.json()
