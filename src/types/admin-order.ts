export type OrderStatus =
  | 'placed'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'picked_up'
  | 'cancelled';

export type ShiftStatus = 'open' | 'closed';

export type Shift = {
  id: string;
  status: ShiftStatus;
  opened_at: string;
  closed_at: string | null;
};

export type CashTransactionType = 'base' | 'income' | 'expense';

export type CashTransaction = {
  id: string;
  shift_id: string;
  type: CashTransactionType;
  amount: number;
  description: string | null;
  order_id: string | null;
  created_at: string;
};

export type ShiftTotals = {
  base: number;
  income: number;
  expense: number;
};

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
