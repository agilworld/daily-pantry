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

  async getEmployeeOrders(employeeId: string, date?: string): Promise<Order[]> {
    return this.repo.findByEmployee(employeeId, date);
  }

  async getSellerOrders(sellerId: string, status?: OrderStatus, date?: string): Promise<Order[]> {
    return this.repo.findBySeller(sellerId, status, date);
  }

  async getAllOrders(date?: string): Promise<Order[]> {
    return this.repo.findAll(date);
  }

  async getReadyOrders(): Promise<Order[]> {
    return this.repo.findReadyForDelivery();
  }

  private validateTransition(currentStatus: OrderStatus, newStatus: OrderStatus): boolean {
    return ORDER_TRANSITIONS[currentStatus]?.includes(newStatus) ?? false;
  }

  async confirmOrder(id: string, officeBoyId: string): Promise<Order> {
    const order = await this.repo.findById(id);
    if (!order) throw new Error("Order not found");
    if (!this.validateTransition(order.status, "confirmed")) {
      throw new Error(`Cannot transition from ${order.status} to confirmed`);
    }
    await this.repo.updateStatus(id, "confirmed", "confirmed_at");
    return (await this.repo.findById(id)) as Order;
  }

  async readyOrder(id: string, officeBoyId: string, fulfillmentNotes?: string): Promise<Order> {
    const order = await this.repo.findById(id);
    if (!order) throw new Error("Order not found");
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
    // Cancel is only allowed while the order is still placed (confirmed_at IS NULL).
    // This is the primary enforcement; ORDER_TRANSITIONS is belt-and-suspenders.
    if (order.confirmed_at !== null) throw new Error("Cannot cancel: order already confirmed");
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

  /**
   * Employee accepts a DELIVERED order (one-way). Sets accepted_at; status stays "delivered".
   *
   * @param orderId - Order to accept
   * @param employeeId - Employee claiming the order (must own it)
   * @returns The updated order
   * @throws {Error} If the order is missing, not owned by the employee, not delivered, or already accepted
   */
  async acceptOrder(orderId: string, employeeId: string): Promise<Order> {
    const order = await this.repo.findById(orderId);
    if (!order) throw new Error("Order not found");
    if (order.employee_id !== employeeId) throw new Error("Not your order");
    if (order.status !== "delivered") throw new Error("Order not delivered yet");
    if (order.accepted_at !== null) throw new Error("Order already accepted");
    await this.repo.updateStatus(orderId, "delivered", "accepted_at");
    return (await this.repo.findById(orderId)) as Order;
  }

  /**
   * Office boy confirms ALL placed orders (optionally scoped to a date).
   *
   * @param date - Optional YYYY-MM-DD filter; undefined means no date scope
   * @returns Counts of confirmed and skipped orders
   */
  async confirmAllPlaced(date?: string): Promise<{ confirmed: number; skipped: number }> {
    const placed = await this.repo.findByStatus("placed", date);
    let confirmed = 0;
    for (const order of placed) {
      await this.confirmOrder(order.id, order.seller_id); // office boy confirms regardless of seller ownership
      confirmed++;
    }
    return { confirmed, skipped: 0 };
  }
}
