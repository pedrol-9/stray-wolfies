export type SelectedModifiers = Record<string, string[]>;

export type CartLine = {
  id: string;
  menuItemId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  modifiers: SelectedModifiers;
  modifierLabels: string[];
  lineTotal: number;
};

export type Fulfillment = 'pickup' | 'delivery';

export type CustomerInfo = {
  name: string;
  phone: string;
  notes: string;
  fulfillment: Fulfillment;
  address: string;
  pickup: 'asap' | 'scheduled';
  pickupTime?: string;
};

export type OrderPayload = {
  lines: CartLine[];
  customer: CustomerInfo;
  subtotal: number;
  createdAt: string;
};
