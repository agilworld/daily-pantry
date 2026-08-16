import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Mock TanStack Router
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to, className }: { children: React.ReactNode; to: string; className?: string }) => (
    <a href={to} className={className}>{children}</a>
  ),
  useNavigate: () => vi.fn(),
}));

// Mock useAuth — employee can order
vi.mock("../../hooks/useAuth", () => ({
  useAuth: () => ({
    user: {
      id: "e1",
      name: "Employee",
      email: "emp@corp.com",
      role_id: "r1",
      role_name: "employee",
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

// Mock meal hooks — active catalog returns meals with category_name
vi.mock("../../hooks/useMeals", () => ({
  useActiveMeals: () => ({
    data: [
      {
        id: "m1",
        seller_id: "s1",
        name: "Nasi Goreng",
        description: null,
        price_cents: 15000,
        category_id: "c1",
        category_name: "Warung Bu Siti",
        is_active: true,
        created_at: "2026-08-16T08:00:00Z",
        updated_at: null,
      },
      {
        id: "m2",
        seller_id: "s2",
        name: "Es Teh",
        description: null,
        price_cents: 5000,
        category_id: "c2",
        category_name: "Kantin Sejahtera",
        is_active: true,
        created_at: "2026-08-16T08:00:00Z",
        updated_at: null,
      },
      {
        id: "m3",
        seller_id: "s3",
        name: "Homemade Cookie",
        description: null,
        price_cents: 8000,
        category_id: null,
        category_name: null,
        is_active: true,
        created_at: "2026-08-16T08:00:00Z",
        updated_at: null,
      },
    ],
    isLoading: false,
  }),
  type: {},
}));

// Mock category hooks — food stores used for the filter chips
vi.mock("../../hooks/useCategories", () => ({
  useCategories: () => ({
    data: [
      { id: "c1", name: "Warung Bu Siti", description: null, is_active: true },
      { id: "c2", name: "Kantin Sejahtera", description: "Main canteen", is_active: true },
    ],
    isLoading: false,
  }),
  type: {},
}));

// Mock order hook
const mockPlaceOrder = vi.fn();
vi.mock("../../hooks/useOrders", () => ({
  usePlaceOrder: () => ({
    mutate: mockPlaceOrder,
    isPending: false,
    isError: false,
    error: null,
  }),
}));

import { OrderPage } from "../order";

function renderOrder() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <OrderPage />
    </QueryClientProvider>,
  );
}

describe("OrderPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders food store filter chips from categories", () => {
    renderOrder();
    expect(screen.getByRole("button", { name: /all/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Warung Bu Siti" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Kantin Sejahtera" })).toBeInTheDocument();
  });

  it("shows food store badge on meal cards", () => {
    renderOrder();
    // The food store name appears on the filter chip AND the meal card badge
    expect(screen.getAllByText("Warung Bu Siti").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Kantin Sejahtera").length).toBeGreaterThan(0);
  });

  it("filters meals client-side when a food store chip is selected", async () => {
    const user = userEvent.setup();
    renderOrder();

    await user.click(screen.getByRole("button", { name: "Warung Bu Siti" }));

    expect(screen.getByText("Nasi Goreng")).toBeInTheDocument();
    expect(screen.queryByText("Es Teh")).not.toBeInTheDocument();
  });

  it("shows own-selling meals when All is selected", () => {
    renderOrder();
    expect(screen.getByText("Homemade Cookie")).toBeInTheDocument();
  });
});
