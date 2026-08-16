import { eq, and, desc, like, sql } from "drizzle-orm";
import { orders } from "@dailypantry/shared";
import type { DbClient } from "../middleware/db.middleware";
import type { Order, OrderStatus } from "./order.model";

export class OrderRepository {
  constructor(private db: DbClient) {}

  async createOrder(data: {
    order_no: string;
    employee_id: string;
    meal_id: string;
    seller_id: string;
    meal_name: string;
    meal_price_cents: number;
    quantity: number;
    total_cents: number;
    notes: string | null;
  }): Promise<Order> {
    const rows = await this.db
      .insert(orders)
      .values({ ...data, status: "placed", placed_at: new Date().toISOString(), order_date: new Date().toISOString() })
      .returning();
    return rows[0] as Order;
  }

  async findById(id: string): Promise<Order | null> {
    const rows = await this.db.select().from(orders).where(eq(orders.id, id)).limit(1);
    return rows.length ? (rows[0] as Order) : null;
  }

  async findAll(date?: string): Promise<Order[]> {
    const conditions: ReturnType<typeof sql>[] = [];
    if (date) conditions.push(like(orders.order_date, `${date}%`));
    return this.db
      .select()
      .from(orders)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(orders.created_at)) as Promise<Order[]>;
  }

  async findByEmployee(employeeId: string, date?: string): Promise<Order[]> {
    const conditions = [eq(orders.employee_id, employeeId)];
    if (date) conditions.push(like(orders.order_date, `${date}%`));
    return this.db
      .select()
      .from(orders)
      .where(and(...conditions))
      .orderBy(desc(orders.created_at)) as Promise<Order[]>;
  }

  async findBySeller(sellerId: string, status?: OrderStatus, date?: string): Promise<Order[]> {
    const conditions = [eq(orders.seller_id, sellerId)];
    if (status) conditions.push(eq(orders.status, status));
    if (date) conditions.push(like(orders.order_date, `${date}%`));
    return this.db
      .select()
      .from(orders)
      .where(and(...conditions))
      .orderBy(desc(orders.created_at)) as Promise<Order[]>;
  }

  async findReadyForDelivery(): Promise<Order[]> {
    return this.db
      .select()
      .from(orders)
      .where(eq(orders.status, "ready"))
      .orderBy(desc(orders.created_at)) as Promise<Order[]>;
  }

  async updateStatus(id: string, status: OrderStatus, timestampField?: string, fulfillmentNotes?: string): Promise<void> {
    const updateData: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
    if (timestampField) updateData[timestampField] = new Date().toISOString();
    if (fulfillmentNotes) updateData.fulfillment_notes = fulfillmentNotes;
    await this.db.update(orders).set(updateData).where(eq(orders.id, id));
  }
}
