import { API_TOKEN, API_URL } from "@/lib/api";

export function eventSocketUrl(apiUrl = API_URL, token = API_TOKEN): string {
  const wsBase = apiUrl.replace(/^http/, "ws");
  return `${wsBase}/ws/events?token=${encodeURIComponent(token)}`;
}
