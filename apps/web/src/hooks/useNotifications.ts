import { useCallback, useEffect, useState } from 'react';
import { API_WS_URL, deleteNotification, getNotifications, getToken, type NotificationItem } from '@/lib/api';
import { isMockToken } from '@/lib/mockAuth';

function minutesAgo(m: number) {
  return new Date(Date.now() - m * 60_000).toISOString();
}

/** Workspace notices shown alongside live DM notifications so the demo inbox is never empty. */
const SYSTEM_NOTICES: NotificationItem[] = [
  { id: -1, kind: 'system', title: 'You’ve used 62% of this month’s messages', body: 'At this pace you’ll reach the limit around Nov 24.', sender_id: null, is_read: false, created_at: minutesAgo(35) },
  { id: -2, kind: 'system', title: 'Priya Nair uploaded q3_revenue.csv', body: 'Open it in Data Studio to explore.', sender_id: null, is_read: false, created_at: minutesAgo(80) },
  { id: -3, kind: 'system', title: 'Invoice INV-202609-4858 paid', body: '$245.00 charged to Visa •••• 4242', sender_id: null, is_read: true, created_at: minutesAgo(60 * 30) },
];

/** Live notifications (REST + WebSocket with polling fallback), merged with local workspace notices. */
export default function useNotifications() {
  const [live, setLive] = useState<NotificationItem[]>([]);
  const [system, setSystem] = useState<NotificationItem[]>(SYSTEM_NOTICES);

  const liveEnabled = () => {
    const t = getToken();
    return !!t && !isMockToken(t);
  };

  useEffect(() => {
    if (!liveEnabled()) return;
    const load = () =>
      getNotifications()
        .then((res) => setLive(res.notifications))
        .catch(() => {
          /* silent */
        });
    load();
    const poll = window.setInterval(load, 30000);
    return () => window.clearInterval(poll);
  }, []);

  useEffect(() => {
    const token = getToken();
    if (!token || isMockToken(token)) return;
    let ws: WebSocket | null = null;
    let retry: number | undefined;
    let closed = false;
    const connect = () => {
      if (closed) return;
      try {
        ws = new WebSocket(`${API_WS_URL}/ws/notifications?token=${encodeURIComponent(token)}`);
      } catch {
        retry = window.setTimeout(connect, 5000);
        return;
      }
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'notification' && data.notification) {
            setLive((prev) => [data.notification, ...prev].slice(0, 100));
          }
        } catch {
          /* ignore malformed */
        }
      };
      ws.onclose = () => {
        if (!closed) retry = window.setTimeout(connect, 4000);
      };
      ws.onerror = () => ws?.close();
    };
    connect();
    return () => {
      closed = true;
      if (retry) window.clearTimeout(retry);
      ws?.close();
    };
  }, []);

  const items = [...live, ...system].sort(
    (a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()
  );

  const remove = useCallback((id: number) => {
    if (id < 0) {
      setSystem((prev) => prev.filter((n) => n.id !== id));
      return;
    }
    setLive((prev) => prev.filter((n) => n.id !== id));
    void deleteNotification(id).catch(() => {
      /* optimistic */
    });
  }, []);

  const markAllRead = useCallback(() => {
    setLive((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setSystem((prev) => prev.map((n) => ({ ...n, is_read: true })));
  }, []);

  return { items, unread: items.filter((n) => !n.is_read).length, remove, markAllRead };
}
