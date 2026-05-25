import type { OrderStatus } from '../types/admin-order';

export const STATUS_LABELS: Record<OrderStatus, string> = {
  placed: 'Nuevo — por aceptar',
  confirmed: 'Aceptado',
  preparing: 'En producción',
  ready: 'Listo para entregar/recoger',
  picked_up: 'Finalizado',
  cancelled: 'Cancelado',
};

export const ACTIVE_STATUSES: OrderStatus[] = [
  'placed',
  'confirmed',
  'preparing',
  'ready',
];

export const DONE_STATUSES: OrderStatus[] = ['picked_up', 'cancelled'];

type Action = {
  next: OrderStatus;
  label: string;
  variant?: 'primary' | 'danger';
};

export function getOrderActions(
  status: OrderStatus,
  fulfillment: 'pickup' | 'delivery',
): Action[] {
  switch (status) {
    case 'placed':
      return [
        { next: 'confirmed', label: 'Aceptar pedido', variant: 'primary' },
        { next: 'cancelled', label: 'Rechazar', variant: 'danger' },
      ];
    case 'confirmed':
      return [
        { next: 'preparing', label: 'A producción', variant: 'primary' },
        { next: 'cancelled', label: 'Cancelar', variant: 'danger' },
      ];
    case 'preparing':
      return [
        { next: 'ready', label: 'Marcar listo', variant: 'primary' },
        { next: 'cancelled', label: 'Cancelar', variant: 'danger' },
      ];
    case 'ready':
      return [
        {
          next: 'picked_up',
          label: fulfillment === 'delivery' ? 'Marcar entregado' : 'Marcar recogido',
          variant: 'primary',
        },
        { next: 'cancelled', label: 'Cancelar', variant: 'danger' },
      ];
    default:
      return [];
  }
}

export function formatOrderTime(iso: string): string {
  return new Intl.DateTimeFormat('es-CO', {
    timeZone: 'America/Bogota',
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(iso));
}

export function formatFulfillment(
  fulfillment: 'pickup' | 'delivery',
  address: string | null,
): string {
  if (fulfillment === 'delivery') {
    return address ? `Domicilio — ${address}` : 'Domicilio';
  }
  return 'Recoger en local';
}

export function formatTiming(
  timing: 'asap' | 'scheduled',
  scheduledTime: string | null,
): string {
  if (timing === 'scheduled' && scheduledTime) {
    return `Hora estimada: ${scheduledTime}`;
  }
  return 'Lo antes posible';
}
