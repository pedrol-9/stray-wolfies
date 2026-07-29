/** Estado de la tienda devuelto por /api/shop-status */
export type ShopStatus = {
  acceptingOrders: boolean;
  isOpen: boolean;
  message: string;
  scheduleLabel: string;
};
