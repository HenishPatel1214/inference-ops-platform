from typing import Any

import httpx

from app.core.config import Settings, get_settings


class UpstreamInferenceError(Exception):
    def __init__(self, status_code: int, message: str) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.message = message


class OpenAICompatibleGateway:
    def __init__(
        self,
        settings: Settings,
        transport: httpx.AsyncBaseTransport | None = None,
    ) -> None:
        self.settings = settings
        self.transport = transport

    async def create_chat_completion(self, payload: dict[str, Any]) -> dict[str, Any]:
        headers = {"Authorization": f"Bearer {self.settings.inference_upstream_api_key}"}
        timeout = httpx.Timeout(self.settings.inference_upstream_timeout_seconds)
        try:
            async with httpx.AsyncClient(
                base_url=f"{self.settings.inference_upstream_url.rstrip('/')}/",
                headers=headers,
                timeout=timeout,
                transport=self.transport,
            ) as client:
                response = await client.post("chat/completions", json=payload)
        except httpx.TimeoutException as exc:
            raise UpstreamInferenceError(504, "Inference upstream timed out") from exc
        except httpx.RequestError as exc:
            raise UpstreamInferenceError(502, "Inference upstream is unavailable") from exc

        if response.is_error:
            message = _upstream_error_message(response)
            status_code = response.status_code if response.status_code < 500 else 502
            raise UpstreamInferenceError(status_code, message)

        try:
            body = response.json()
        except ValueError as exc:
            raise UpstreamInferenceError(502, "Inference upstream returned invalid JSON") from exc
        if not isinstance(body, dict):
            raise UpstreamInferenceError(502, "Inference upstream returned an invalid response")
        return body


def _upstream_error_message(response: httpx.Response) -> str:
    try:
        body = response.json()
    except ValueError:
        return response.text[:500] or "Inference upstream request failed"
    if isinstance(body, dict):
        error = body.get("error")
        if isinstance(error, dict) and isinstance(error.get("message"), str):
            return error["message"]
        if isinstance(error, str):
            return error
    return "Inference upstream request failed"


def get_inference_gateway() -> OpenAICompatibleGateway:
    return OpenAICompatibleGateway(get_settings())
