import { OrderRepository } from "./order.repository";
import type { Order, OrderStatus } from "./order.model";
import { ORDER_TRANSITIONS } from "./order.model";

export class OrderService {
  constructor(private repo: OrderRepository) {}

  async placeOrder(
    employeeId: string,
    data: {
      meal_id: string;
      seller_id: string;
      meal_name: string;
      meal_price_cents: number;
      quantity: number;
      notes: string | null;
    },
  ): Promise<Order> {
    const orderNo = `ORD-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const totalCents = data.meal_price_cents * data.quantity;

    return this.repo.createOrder({
      order_no: orderNo,
      employee_id: employeeId,
      meal_id: data.meal_id,
      seller_id: data.seller_id,
      meal_name: data.meal_name,
      meal_price_cents: data.meal_price_cents,
      quantity: data.quantity,
      total_cents: totalCents,
      notes: data.notes,
    });
  }

  async getEmployeeOrders(employeeId: string): Promise<Order[]> {
    return this.repo.findByEmployee(employeeId);
  }

  async getSellerOrders(sellerId: string, status?: OrderStatus): Promise<Order[]> {
    return this.repo.findBySeller(sellerId, status);
  }

  async getReadyOrders(): Promise<Order[]> {
    return this.repo.findReadyForDelivery();
  }

  private validateTransition(currentStatus: OrderStatus, newStatus: OrderStatus): boolean {
    return ORDER_TRANSITIONS[currentStatus]?.includes(newStatus) ?? false;
  }

  async confirmOrder(id: string, sellerId: string): Promise<Order> {
    const order = await this.repo.findById(id);
    if (!order) throw new Error("Order not found");
    if (order.seller_id !== sellerId) throw new Error("Not your order");
    if (!this.validateTransition(order.status, "confirmed")) {
      throw new Error(`Cannot transition from ${order.status} to confirmed`);
    }
    await this.repo.updateStatus(id, "confirmed", "confirmed_at");
    return (await this.repo.findById(id)) as Order;
  }

  async readyOrder(id: string, sellerId: string, fulfillmentNotes?: string): Promise<Order> {
    const order = await this.repo.findById(id);
    if (!order) throw new Error("Order not found");
    if (order.seller_id !== sellerId) throw new Error("Not your order");
    if (!this.validateTransition(order.status, "ready")) {
      throw new Error(`Cannot transition from ${order.status} to ready`);
    }
    await this.repo.updateStatus(id, "ready", "ready_at", fulfillmentNotes);
    return (await this.repo.findById(id)) as Order;
  }

  async deliverOrder(id: string, _officeBoyId: string, fulfillmentNotes?: string): Promise<Order> {
    const order = await this.repo.findById(id);
    if (!order) throw new Error("Order not found");
    if (!this.validateTransition(order.status, "delivered")) {
      throw new Error(`Cannot transition from ${order.status} to delivered`);
    }
    await this.repo.updateStatus(id, "delivered", "delivered_at", fulfillmentNotes);
    return (await this.repo.findById(id)) as Order;
  }

  async cancelOrder(id: string, userId: string, userRole: string, fulfillmentNotes?: string): Promise<Order> {
    const order = await this.repo.findById(id);
    if (!order) throw new Error("Order not found");
    // Authorization: employee (own order), seller (own meal), office_boy (any)
    if (userRole === "employee" && order.employee_id !== userId) throw new Error("Not your order");
    if (userRole === "seller" && order.seller_id !== userId) throw new Error("Not your order");
    if (!["employee", "seller", "office_boy"].includes(userRole)) throw new Error("Not authorized to cancel");
    if (!this.validateTransition(order.status, "cancelled")) {
      throw new Error(`Cannot transition from ${order.status} to cancelled`);
    }
    await this.repo.updateStatus(id, "cancelled", "cancelled_at", fulfillmentNotes);
    return (await this.repo.findById(id)) as Order;
  }
}
