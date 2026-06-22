def test_websocket_receives_created_event(client, auth_headers):
    with client.websocket_connect("/ws/events?token=test-token") as websocket:
        response = client.post(
            "/api/events",
            headers=auth_headers,
            json={
                "event_type": "node.heartbeat",
                "severity": "info",
                "message": "worker-test heartbeat accepted",
                "payload": {"node": "worker-test"},
            },
        )
        assert response.status_code == 201
        event = websocket.receive_json()

    assert event["event_type"] == "node.heartbeat"
    assert event["payload"]["node"] == "worker-test"
