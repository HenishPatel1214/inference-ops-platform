from collections.abc import AsyncIterator
from typing import Any

import httpx

from app.core.config import Settings, get_settings


class UpstreamInferenceError(Exception):
    def __init__(self, status_code: int, message: str) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.message = message


class ChatCompletionStream:
    def __init__(self, client: httpx.AsyncClient, response: httpx.Response) -> None:
        self.client = client
        self.response = response

    async def aiter_lines(self) -> AsyncIterator[str]:
        async for line in self.response.aiter_lines():
            yield line

    async def aclose(self) -> None:
        await self.response.aclose()
        await self.client.aclose()


class OpenAICompatibleGateway:
    def __init__(
        self,
        settings: Settings,
        transport: httpx.AsyncBaseTransport | None = None,
    ) -> None:
        self.settings = settings
        self.transport = transport

    async def create_chat_completion(self, payload: dict[str, Any]) -> dict[str, Any]:
        try:
            async with self._client() as client:
                response = await client.post("chat/completions", json=payload)
        except httpx.RequestError as exc:
            raise _request_error(exc) from exc

        if response.is_error:
            raise _response_error(response)

        try:
            body = response.json()
        except ValueError as exc:
            raise UpstreamInferenceError(502, "Inference upstream returned invalid JSON") from exc
        if not isinstance(body, dict):
            raise UpstreamInferenceError(502, "Inference upstream returned an invalid response")
        return body

    async def open_chat_completion_stream(
        self,
        payload: dict[str, Any],
    ) -> ChatCompletionStream:
        client = self._client()
        try:
            request = client.build_request("POST", "chat/completions", json=payload)
            response = await client.send(request, stream=True)
        except httpx.RequestError as exc:
            await client.aclose()
            raise _request_error(exc) from exc

        if response.is_error:
            await response.aread()
            error = _response_error(response)
            await response.aclose()
            await client.aclose()
            raise error
        return ChatCompletionStream(client, response)

    def _client(self) -> httpx.AsyncClient:
        return httpx.AsyncClient(
            base_url=f"{self.settings.inference_upstream_url.rstrip('/')}/",
            headers={"Authorization": f"Bearer {self.settings.inference_upstream_api_key}"},
            timeout=httpx.Timeout(self.settings.inference_upstream_timeout_seconds),
            transport=self.transport,
        )


def _request_error(exc: httpx.RequestError) -> UpstreamInferenceError:
    if isinstance(exc, httpx.TimeoutException):
        return UpstreamInferenceError(504, "Inference upstream timed out")
    return UpstreamInferenceError(502, "Inference upstream is unavailable")


def _response_error(response: httpx.Response) -> UpstreamInferenceError:
    status_code = response.status_code if response.status_code < 500 else 502
    return UpstreamInferenceError(status_code, _upstream_error_message(response))


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
