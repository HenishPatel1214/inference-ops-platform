export function formatNumber(value: number): string {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(value);
}

export function formatMs(value: number): string {
  return `${Math.round(value)} ms`;
}

export function formatPercent(value: number): string {
  return `${Number(value.toFixed(1))}%`;
}

export function formatTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(new Date(value));
}

export function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(new Date(value));
}

export function payloadPreview(payload: Record<string, unknown>): string {
  const serialized = JSON.stringify(payload);
  if (!serialized || serialized === "{}") return "No payload";
  return serialized.length > 92 ? `${serialized.slice(0, 92)}...` : serialized;
}

export function modelLabel(modelName: string): string {
  return modelName.replace(/-/g, " ");
}
