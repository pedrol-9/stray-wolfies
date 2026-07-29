const SOUND_KEY = 'callejeros_admin_sound';
const PUSH_KEY = 'callejeros_admin_push';

export function isSoundEnabled(): boolean {
  if (typeof localStorage === 'undefined') return true;
  return localStorage.getItem(SOUND_KEY) !== 'off';
}

export function setSoundEnabled(on: boolean) {
  localStorage.setItem(SOUND_KEY, on ? 'on' : 'off');
}

export function isPushEnabled(): boolean {
  if (typeof localStorage === 'undefined') return true;
  return localStorage.getItem(PUSH_KEY) !== 'off';
}

export function setPushEnabled(on: boolean) {
  localStorage.setItem(PUSH_KEY, on ? 'on' : 'off');
}

export async function requestPushPermission(): Promise<NotificationPermission> {
  if (typeof Notification === 'undefined') return 'denied';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  return Notification.requestPermission();
}

export function showOrderNotification(
  order: {
    code: string;
    customer_name: string;
    total: number;
    id: string;
  },
  enabled = isPushEnabled(),
) {
  if (typeof Notification === 'undefined') return;
  if (!enabled || Notification.permission !== 'granted') return;

  new Notification('🐺 Callejeros — Nuevo pedido', {
    body: `${order.code} · ${order.customer_name}`,
    tag: `order-${order.id}`,
    icon: '/favicon.svg',
  });
}
