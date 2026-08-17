import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Mock TanStack Router
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
  useNavigate: () => vi.fn(),
}));

// Mock useAuth — office boy (can confirm all)
vi.mock("../../hooks/useAuth", () => ({
  useAuth: () => ({
    user: {
      id: "ob1",
      name: "Boy",
      email: "boy@corp.com",
      role_id: "r2",
      role_name: "office_boy",
      phone_no: null,
      avatar: null,
      description: null,
      is_active: true,
      blocked: false,
      created_at: "2026-01-01",
    },
    isLoading: false,
    isAuthenticated: true,
  }),
  useLogout: () => ({ mutate: vi.fn(), isPending: false }),
}));

const mockConfirmAllMutate = vi.fn();
const mockConfirmOrder = vi.fn();
const mockReadyOrder = vi.fn();
const mockDeliverOrder = vi.fn();
const mockCancelOrder = vi.fn();

let mockAllOrders: unknown[] = [];
vi.mock("../../hooks/useOrders", () => ({
  useSellerOrders: () => ({ data: [], isLoading: false }),
  useAllOrders: () => ({ data: mockAllOrders, isLoading: false }),
  useConfirmOrder: () => ({
    mutate: mockConfirmOrder,
    isPending: false,
    isError: false,
    error: null,
  }),
  useReadyOrder: () => ({
    mutate: mockReadyOrder,
    isPending: false,
    isError: false,
    error: null,
  }),
  useDeliverOrder: () => ({
    mutate: mockDeliverOrder,
    isPending: false,
    isError: false,
    error: null,
  }),
  useCancelOrder: () => ({
    mutate: mockCancelOrder,
    isPending: false,
    isError: false,
    error: null,
  }),
  useConfirmAllOrders: () => ({
    mutate: mockConfirmAllMutate,
    isPending: false,
    isError: false,
    error: null,
  }),
}));

import { FulfillmentPage } from "../fulfillment";

function renderFulfillment() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <FulfillmentPage />
    </QueryClientProvider>,
  );
}

function order(id: string, status: string, total_cents: number) {
  return {
    id,
    order_no: `ORD-${id}`,
    seller_id: "s1",
    employee_id: "e1",
    meal_id: "m1",
    meal_name: `Meal ${id}`,
    meal_price_cents: 15000,
    quantity: 1,
    total_cents,
    status,
    notes: null,
    fulfillment_notes: null,
    order_date: "2026-08-17T08:00:00Z",
    placed_at: "2026-08-17T08:00:00Z",
    confirmed_at: null,
    ready_at: null,
    delivered_at: null,
    accepted_at: null,
    cancelled_at: null,
  };
}

describe("FulfillmentPage (office boy)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAllOrders = [];
  });

  it("shows Confirm it All button when there are placed orders", () => {
    mockAllOrders = [order("o1", "placed", 15000)];
    renderFulfillment();
    expect(screen.getByRole("button", { name: /confirm it all/i })).toBeInTheDocument();
  });

  it("hides Confirm it All when there are no placed orders", () => {
    mockAllOrders = [order("o1", "confirmed", 15000)];
    renderFulfillment();
    expect(screen.queryByRole("button", { name: /confirm it all/i })).not.toBeInTheDocument();
  });

  it("opens the confirmation dialog with the placed count", async () => {
    const user = userEvent.setup();
    mockAllOrders = [
      order("o1", "placed", 15000),
      order("o2", "placed", 10000),
      order("o3", "confirmed", 5000),
    ];
    renderFulfillment();

    await user.click(screen.getByRole("button", { name: /confirm it all/i }));

    // Text is split across a <strong>2</strong> node; assert on the dialog heading + count presence
    expect(screen.getByRole("heading", { name: /confirm it all/i })).toBeInTheDocument();
    expect(screen.getByText(/awaiting confirmation\. Confirm them all at once\?/i)).toBeInTheDocument();
  });

  it("calls confirm-all mutation and shows the confirmed result", async () => {
    const user = userEvent.setup();
    mockAllOrders = [order("o1", "placed", 15000)];
    mockConfirmAllMutate.mockImplementation((_data, opts) => {
      opts?.onSuccess?.({ confirmed: 1 });
    });
    renderFulfillment();

    await user.click(screen.getByRole("button", { name: /confirm it all/i }));
    await user.click(screen.getByRole("button", { name: /^confirm all$/i }));

    await waitFor(() => expect(mockConfirmAllMutate).toHaveBeenCalled());
    expect(screen.getByText(/1 order confirmed/i)).toBeInTheDocument();
  });

  it("shows total in IDR for filtered orders", () => {
    mockAllOrders = [
      order("o1", "placed", 15000),
      order("o2", "placed", 10000),
    ];
    renderFulfillment();
    // Rp 25.000 for the two placed orders shown by default ("all" filter)
    expect(screen.getByText(/Rp\s*25\.?000/i)).toBeInTheDocument();
  });

  it("shows helper text in status labels", () => {
    mockAllOrders = [order("o1", "placed", 15000)];
    renderFulfillment();
    // The label appears in both the filter tab and the order card badge
    expect(screen.getAllByText(/Placed \(awaiting confirmation\)/i).length).toBeGreaterThan(0);
  });
});
