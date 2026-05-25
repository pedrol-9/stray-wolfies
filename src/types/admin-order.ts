export type OrderStatus =
  | 'placed'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'picked_up'
  | 'cancelled';

export type OrderLineRow = {
  id: string;
  menu_item_id: string;
  item_name: string;
  quantity: number;
  modifier_labels: string[];
  line_total: number;
};

export type AdminOrder = {
  id: string;
  code: string;
  customer_name: string;
  customer_phone: string;
  fulfillment: 'pickup' | 'delivery';
  delivery_address: string | null;
  delivery_fee: number;
  timing: 'asap' | 'scheduled';
  scheduled_time: string | null;
  notes: string | null;
  subtotal: number;
  total: number;
  status: OrderStatus;
  created_at: string;
  order_lines: OrderLineRow[];
};
