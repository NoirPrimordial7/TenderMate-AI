export type CacheEvent =
  | { type: "tender-created" | "tender-deleted" | "credits-changed"; userId: string; tenderId?: string }
  | { type: "tender-status" | "report-completed" | "report-failed" | "chat-answer"; userId: string; tenderId: string };

export const CACHE_EVENT_NAME = "nividaiq:cache-event";

export function publishCacheEvent(event: CacheEvent) {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent<CacheEvent>(CACHE_EVENT_NAME, { detail: event }));
}

export function subscribeCacheEvents(callback: (event: CacheEvent) => void) {
  if (typeof window === "undefined") return () => undefined;
  const listener = (event: Event) => callback((event as CustomEvent<CacheEvent>).detail);
  window.addEventListener(CACHE_EVENT_NAME, listener);
  return () => window.removeEventListener(CACHE_EVENT_NAME, listener);
}
