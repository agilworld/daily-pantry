import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

// Mock api
const mockGet = vi.fn();
const mockPost = vi.fn();
const mockPatch = vi.fn();
vi.mock("../../lib/api", () => ({
  api: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    patch: (...args: unknown[]) => mockPatch(...args),
    del: vi.fn(),
  },
}));

import {
  useAcceptOrder,
  useConfirmAllOrders,
  useConfirmOrder,
  useDeliverOrder,
  type Order,
} from "../useOrders";

function makeOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: "o1",
    order_no: "ORD-1",
    seller_id: "s1",
    employee_id: "e1",
    meal_id: "m1",
    meal_name: "Nasi Goreng",
    meal_price_cents: 15000,
    quantity: 2,
    total_cents: 30000,
    status: "placed",
    notes: null,
    fulfillment_notes: null,
    order_date: "2026-08-17T08:00:00Z",
    placed_at: "2026-08-17T08:00:00Z",
    confirmed_at: null,
    ready_at: null,
    delivered_at: null,
    accepted_at: null,
    cancelled_at: null,
    ...overrides,
  };
}

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe("order mutations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("useAcceptOrder posts to POST /orders/:id/accept", async () => {
    mockPost.mockResolvedValueOnce({ order: makeOrder({ status: "delivered" }) });
    const { result } = renderHook(() => useAcceptOrder(), { wrapper });

    result.current.mutate("o1");

    await waitFor(() =>
      expect(mockPost).toHaveBeenCalledWith("/orders/o1/accept", {}),
    );
  });

  it("useConfirmAllOrders posts to POST /orders/confirm-all", async () => {
    mockPost.mockResolvedValueOnce({ confirmed: 3 });
    const { result } = renderHook(() => useConfirmAllOrders(), { wrapper });

    result.current.mutate();

    await waitFor(() => expect(mockPost).toHaveBeenCalledWith("/orders/confirm-all", {}));
  });

  it("useConfirmOrder patches /orders/:id/confirm", async () => {
    mockPatch.mockResolvedValueOnce({ order: makeOrder({ status: "confirmed" }) });
    const { result } = renderHook(() => useConfirmOrder(), { wrapper });

    result.current.mutate("o1");

    await waitFor(() =>
      expect(mockPatch).toHaveBeenCalledWith("/orders/o1/confirm", {}),
    );
  });

  it("useDeliverOrder patches /orders/:id/deliver", async () => {
    mockPatch.mockResolvedValueOnce({ order: makeOrder({ status: "delivered" }) });
    const { result } = renderHook(() => useDeliverOrder(), { wrapper });

    result.current.mutate({ id: "o1", fulfillment_notes: "done" });

    await waitFor(() =>
      expect(mockPatch).toHaveBeenCalledWith("/orders/o1/deliver", {
        fulfillment_notes: "done",
      }),
    );
  });
});
