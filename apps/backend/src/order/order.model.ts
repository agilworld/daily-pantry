export type OrderStatus = "placed" | "confirmed" | "ready" | "delivered" | "cancelled";

export interface Order {
  id: string;
  order_no: string;
  employee_id: string;
  meal_id: string;
  seller_id: string;
  meal_name: string;
  meal_price_cents: number;
  quantity: number;
  total_cents: number;
  status: OrderStatus;
  notes: string | null;
  fulfillment_notes: string | null;
  order_date: string;
  placed_at: string;
  confirmed_at: string | null;
  ready_at: string | null;
  delivered_at: string | null;
  accepted_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string | null;
}

export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  placed: ["confirmed", "cancelled"],
  confirmed: ["ready"],
  ready: ["delivered"],
  delivered: [],
  cancelled: [],
};
