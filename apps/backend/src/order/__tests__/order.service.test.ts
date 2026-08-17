import { describe, it, expect, mock, beforeEach } from "bun:test";
import { OrderService } from "../order.service";
import { OrderRepository } from "../order.repository";
import type { Order } from "../order.model";

const samplePlacedOrder: Order = {
  id: "order-1",
  order_no: "ORD-TEST-001",
  employee_id: "emp-1",
  meal_id: "meal-1",
  seller_id: "seller-1",
  meal_name: "Nasi Goreng",
  meal_price_cents: 25000,
  quantity: 2,
  total_cents: 50000,
  status: "placed",
  notes: null,
  fulfillment_notes: null,
  order_date: "2026-07-18T12:00:00.000Z",
  placed_at: "2026-07-18T12:00:00.000Z",
  confirmed_at: null,
  ready_at: null,
  delivered_at: null,
  accepted_at: null,
  cancelled_at: null,
  created_at: "2026-07-18T12:00:00.000Z",
  updated_at: null,
};

function makeOrder(overrides: Partial<Order> = {}): Order {
  return { ...samplePlacedOrder, ...overrides };
}

function createMockRepo(overrides: Partial<OrderRepository> = {}): OrderRepository {
  return {
    createOrder: mock(() => Promise.resolve(makeOrder())),
    findById: mock(() => Promise.resolve(makeOrder())),
    findAll: mock(() => Promise.resolve([makeOrder()])),
    findByEmployee: mock(() => Promise.resolve([makeOrder()])),
    findBySeller: mock(() => Promise.resolve([makeOrder()])),
    findReadyForDelivery: mock(() => Promise.resolve([makeOrder()])),
    findByStatus: mock(() => Promise.resolve([makeOrder()])),
    updateStatus: mock(() => Promise.resolve()),
    ...overrides,
  } as unknown as OrderRepository;
}

describe("OrderService", () => {
  let repo: OrderRepository;
  let service: OrderService;

  beforeEach(() => {
    repo = createMockRepo();
    service = new OrderService(repo);
  });

  describe("placeOrder", () => {
    it("creates an order with correct totals", async () => {
      const order = await service.placeOrder("emp-1", {
        meal_id: "meal-1",
        seller_id: "seller-1",
        meal_name: "Nasi Goreng",
        meal_price_cents: 25000,
        quantity: 2,
        notes: null,
      });

      expect(order.total_cents).toBe(50000);
      expect(order.meal_name).toBe("Nasi Goreng");
      expect(repo.createOrder).toHaveBeenCalled();
    });
  });

  describe("state transitions", () => {
    it("confirms a placed order", async () => {
      (repo.findById as any).mockResolvedValue(makeOrder({ status: "placed" }));
      const order = await service.confirmOrder("order-1", "ob-1");
      expect(order.status).toBe("placed"); // stub returns placed unchanged, but updateStatus was called
      expect(repo.updateStatus).toHaveBeenCalledWith("order-1", "confirmed", "confirmed_at");
    });

    it("confirms any order regardless of seller ownership (office boy)", async () => {
      (repo.findById as any).mockResolvedValue(makeOrder({ status: "placed", seller_id: "seller-2" }));
      await service.confirmOrder("order-1", "ob-1");
      expect(repo.updateStatus).toHaveBeenCalledWith("order-1", "confirmed", "confirmed_at");
    });

    it("rejects invalid transition (delivered -> confirmed)", async () => {
      (repo.findById as any).mockResolvedValue(makeOrder({ status: "delivered" }));
      await expect(service.confirmOrder("order-1", "ob-1")).rejects.toThrow("Cannot transition from delivered to confirmed");
    });

    it("marks order ready from confirmed", async () => {
      (repo.findById as any).mockResolvedValue(makeOrder({ status: "confirmed" }));
      await service.readyOrder("order-1", "ob-1", "Almost done");
      expect(repo.updateStatus).toHaveBeenCalledWith("order-1", "ready", "ready_at", "Almost done");
    });

    it("readies any order regardless of seller ownership (office boy)", async () => {
      (repo.findById as any).mockResolvedValue(makeOrder({ status: "confirmed", seller_id: "seller-2" }));
      await service.readyOrder("order-1", "ob-1", "Ready");
      expect(repo.updateStatus).toHaveBeenCalledWith("order-1", "ready", "ready_at", "Ready");
    });

    it("delivers a ready order", async () => {
      (repo.findById as any).mockResolvedValue(makeOrder({ status: "ready" }));
      await service.deliverOrder("order-1", "ob-1");
      expect(repo.updateStatus).toHaveBeenCalledWith("order-1", "delivered", "delivered_at", undefined);
    });

    it("rejects delivering from placed (skips state)", async () => {
      (repo.findById as any).mockResolvedValue(makeOrder({ status: "placed" }));
      await expect(service.deliverOrder("order-1", "ob-1")).rejects.toThrow("Cannot transition from placed to delivered");
    });

    it("rejects cancel after order is confirmed (confirmed_at set)", async () => {
      (repo.findById as any).mockResolvedValue(makeOrder({ status: "confirmed", confirmed_at: "2026-07-18T13:00:00.000Z" }));
      await expect(service.cancelOrder("order-1", "emp-1", "employee")).rejects.toThrow("Cannot cancel: order already confirmed");
    });

    it("rejects cancel from confirmed even when confirmed_at is null (transition map)", async () => {
      (repo.findById as any).mockResolvedValue(makeOrder({ status: "confirmed", confirmed_at: null }));
      await expect(service.cancelOrder("order-1", "emp-1", "employee")).rejects.toThrow("Cannot transition from confirmed to cancelled");
    });
  });

  describe("acceptOrder", () => {
    it("accepts a delivered order owned by the employee", async () => {
      const delivered = makeOrder({ status: "delivered", employee_id: "emp-1" });
      (repo.findById as any)
        .mockResolvedValueOnce(delivered)
        .mockResolvedValueOnce({ ...delivered, accepted_at: "2026-07-18T14:00:00.000Z" });
      const order = await service.acceptOrder("order-1", "emp-1");
      expect(repo.updateStatus).toHaveBeenCalledWith("order-1", "delivered", "accepted_at");
      expect(order.accepted_at).toBe("2026-07-18T14:00:00.000Z");
    });

    it("rejects accepting another employee's order", async () => {
      (repo.findById as any).mockResolvedValue(makeOrder({ status: "delivered", employee_id: "emp-2" }));
      await expect(service.acceptOrder("order-1", "emp-1")).rejects.toThrow("Not your order");
    });

    it("rejects accepting an order that is not delivered", async () => {
      (repo.findById as any).mockResolvedValue(makeOrder({ status: "ready", employee_id: "emp-1" }));
      await expect(service.acceptOrder("order-1", "emp-1")).rejects.toThrow("Order not delivered yet");
    });

    it("rejects accepting an already accepted order", async () => {
      (repo.findById as any).mockResolvedValue(makeOrder({ status: "delivered", employee_id: "emp-1", accepted_at: "2026-07-18T14:00:00.000Z" }));
      await expect(service.acceptOrder("order-1", "emp-1")).rejects.toThrow("Order already accepted");
    });

    it("rejects accepting a missing order", async () => {
      (repo.findById as any).mockResolvedValue(null);
      await expect(service.acceptOrder("order-1", "emp-1")).rejects.toThrow("Order not found");
    });
  });

  describe("confirmAllPlaced", () => {
    it("confirms every placed order and returns counts", async () => {
      (repo.findByStatus as any).mockResolvedValue([makeOrder(), makeOrder(), makeOrder()]);
      const result = await service.confirmAllPlaced("2026-07-18");
      expect(repo.findByStatus).toHaveBeenCalledWith("placed", "2026-07-18");
      expect(repo.updateStatus).toHaveBeenCalledTimes(3);
      expect(result).toEqual({ confirmed: 3, skipped: 0 });
    });

    it("returns zero counts when no placed orders", async () => {
      (repo.findByStatus as any).mockResolvedValue([]);
      const result = await service.confirmAllPlaced();
      expect(repo.findByStatus).toHaveBeenCalledWith("placed", undefined);
      expect(result).toEqual({ confirmed: 0, skipped: 0 });
    });
  });

  describe("date filtering", () => {
    it("lists all orders with a date filter", async () => {
      await service.getAllOrders("2026-07-18");
      expect(repo.findAll).toHaveBeenCalledWith("2026-07-18");
    });

    it("lists all orders without a date filter", async () => {
      await service.getAllOrders();
      expect(repo.findAll).toHaveBeenCalledWith(undefined);
    });

    it("passes date to getEmployeeOrders", async () => {
      await service.getEmployeeOrders("emp-1", "2026-07-18");
      expect(repo.findByEmployee).toHaveBeenCalledWith("emp-1", "2026-07-18");
    });

    it("passes date to getSellerOrders", async () => {
      await service.getSellerOrders("seller-1", "placed", "2026-07-18");
      expect(repo.findBySeller).toHaveBeenCalledWith("seller-1", "placed", "2026-07-18");
    });
  });

  describe("cancelOrder authorization", () => {
    it("lets employee cancel their own order", async () => {
      (repo.findById as any).mockResolvedValue(makeOrder({ status: "placed", employee_id: "emp-1" }));
      await service.cancelOrder("order-1", "emp-1", "employee");
      expect(repo.updateStatus).toHaveBeenCalledWith("order-1", "cancelled", "cancelled_at", undefined);
    });

    it("rejects employee canceling another's order", async () => {
      (repo.findById as any).mockResolvedValue(makeOrder({ status: "placed", employee_id: "emp-2" }));
      await expect(service.cancelOrder("order-1", "emp-1", "employee")).rejects.toThrow("Not your order");
    });

    it("lets seller cancel their own order", async () => {
      (repo.findById as any).mockResolvedValue(makeOrder({ status: "placed", seller_id: "seller-1" }));
      await service.cancelOrder("order-1", "seller-1", "seller");
      expect(repo.updateStatus).toHaveBeenCalled();
    });

    it("lets office_boy cancel any order", async () => {
      (repo.findById as any).mockResolvedValue(makeOrder({ status: "placed" }));
      await service.cancelOrder("order-1", "ob-1", "office_boy");
      expect(repo.updateStatus).toHaveBeenCalled();
    });
  });
});
