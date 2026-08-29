import { useEffect, useRef } from 'react';
import { API_BASE_URL, getToken } from '../lib/api';

/**
 * Subscribes to the backend's Server-Sent Events feed (GET
 * /api/events/stream) so a second cashier/pharmacist/director counter's
 * mutation shows up here without waiting for a manual refresh. The stream
 * only ever carries a resource name ("sales", "medicines", ...) — the
 * caller re-fetches that resource through the normal authorized REST
 * endpoint, so this hook can never grant access to data the signed-in
 * employee couldn't already read.
 *
 * Auto-reconnects with a fixed backoff on any drop (network blip, backend
 * restart) — live sync degrading to "just reload the page" on a bad network
 * would be a worse failure mode for a POS counter than a few seconds of lag.
 */
export function useLiveSync(enabled: boolean, onResourceChanged: (resource: string) => void): void {
  const callbackRef = useRef(onResourceChanged);
  callbackRef.current = onResourceChanged;

  useEffect(() => {
    if (!enabled) return;
    const token = getToken();
    if (!token) return;

    let cancelled = false;
    let es: EventSource | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      if (cancelled) return;
      const url = `${API_BASE_URL}/api/events/stream?token=${encodeURIComponent(token)}`;
      es = new EventSource(url);

      es.onmessage = event => {
        try {
          const payload = JSON.parse(event.data) as { resource?: string };
          if (payload.resource) callbackRef.current(payload.resource);
        } catch {
          // Ignore anything that isn't the expected {"resource": "..."} shape.
        }
      };

      es.onerror = () => {
        es?.close();
        es = null;
        if (!cancelled) {
          retryTimer = setTimeout(connect, 5000);
        }
      };
    };

    connect();

    return () => {
      cancelled = true;
      es?.close();
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [enabled]);
}
