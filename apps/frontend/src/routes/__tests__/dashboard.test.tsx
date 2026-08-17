import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Mock TanStack Router (Link + ProtectedRoute's useNavigate)
vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    to,
    className,
  }: {
    children: React.ReactNode;
    to: string;
    className?: string;
  }) => (
    <a href={to} className={className}>
      {children}
    </a>
  ),
  useNavigate: () => vi.fn(),
}));

// Mock useAuth — office boy (has Meals card, no Order nav)
const mockAcceptOrder = vi.fn();
const mockCancelOrder = vi.fn();
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

// Mock order hooks
let mockOrders: unknown[] = [];
vi.mock("../../hooks/useOrders", () => ({
  useMyOrders: () => ({ data: mockOrders, isLoading: false }),
  useAcceptOrder: () => ({
    mutate: mockAcceptOrder,
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
}));

// Mock notes hooks
let mockNotes: unknown[] = [];
vi.mock("../../hooks/useNotes", () => ({
  useNotes: () => ({ data: mockNotes, isLoading: false }),
}));

import { DashboardPage } from "../dashboard";

function renderDashboard() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <DashboardPage />
    </QueryClientProvider>,
  );
}

function placedOrder(id: string, mealName: string) {
  return {
    id,
    order_no: `ORD-${id}`,
    seller_id: "s1",
    employee_id: "e1",
    meal_id: "m1",
    meal_name: mealName,
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
  };
}

function deliveredOrder(id: string, mealName: string, accepted_at: string | null) {
  return {
    ...placedOrder(id, mealName),
    status: "delivered",
    delivered_at: "2026-08-17T09:00:00Z",
    accepted_at,
  };
}

describe("DashboardPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOrders = [];
    mockNotes = [];
  });

  it("office boy sees a Meals card (not Order Meals)", () => {
    renderDashboard();
    expect(screen.getByRole("link", { name: /Meals/i })).toBeInTheDocument();
    expect(screen.queryByText("Order Meals")).not.toBeInTheDocument();
  });

  it("shows Accept button on a delivered order that has not been accepted", () => {
    mockOrders = [deliveredOrder("o1", "Nasi Goreng", null)];
    renderDashboard();
    const acceptButton = screen.getByRole("button", { name: /accept/i });
    expect(acceptButton).toBeInTheDocument();
  });

  it("calls accept mutation when Accept is clicked", async () => {
    const user = userEvent.setup();
    mockOrders = [deliveredOrder("o1", "Nasi Goreng", null)];
    renderDashboard();

    await user.click(screen.getByRole("button", { name: /accept/i }));

    await waitFor(() => expect(mockAcceptOrder).toHaveBeenCalledWith("o1"));
  });

  it("shows Accepted indicator when a delivered order has been accepted", () => {
    mockOrders = [deliveredOrder("o1", "Nasi Goreng", "2026-08-17T10:00:00Z")];
    renderDashboard();
    expect(screen.getByText(/✓ Accepted/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /accept/i })).not.toBeInTheDocument();
  });

  it("shows Cancel button only for placed orders", () => {
    mockOrders = [
      placedOrder("o1", "Nasi Goreng"),
      deliveredOrder("o2", "Es Teh", null),
    ];
    renderDashboard();
    expect(screen.getAllByRole("button", { name: /cancel/i })).toHaveLength(1);
  });

  it("shows today's note with author and time", () => {
    mockNotes = [
      {
        id: "n1",
        author_id: "u1",
        content: "Free lunch today!",
        is_broadcast: true,
        created_at: "2026-08-17T08:00:00Z",
        author_name: "Boy",
        author_avatar: null,
      },
    ];
    renderDashboard();
    expect(screen.getByText("Free lunch today!")).toBeInTheDocument();
    // Author appears in the note footer (also appears in the Welcome header)
    expect(screen.getAllByText(/Boy/).length).toBeGreaterThan(1);
  });

  it("renders image, link, and author avatar in today's note", () => {
    mockNotes = [
      {
        id: "n1",
        author_id: "u1",
        content: "Lunch special",
        is_broadcast: true,
        image: "data:image/jpeg;base64,NOTEIMG",
        link_url: "https://example.com/menu",
        created_at: "2026-08-17T08:00:00Z",
        author_name: "Boy",
        author_avatar: "data:image/jpeg;base64,AVATAR",
      },
    ];
    renderDashboard();

    const noteImg = document.querySelector('img[alt="Note attachment"]');
    expect(noteImg).toHaveAttribute("src", "data:image/jpeg;base64,NOTEIMG");

    const link = screen.getByRole("link", { name: /https:\/\/example\.com\/menu/ });
    expect(link).toHaveAttribute("href", "https://example.com/menu");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");

    const avatars = document.querySelectorAll("img.rounded-full");
    expect(avatars.length).toBeGreaterThan(0);
    expect(avatars[0]).toHaveAttribute("src", "data:image/jpeg;base64,AVATAR");
  });

  it("shows no announcements message when there are no notes", () => {
    renderDashboard();
    expect(screen.getByText("No announcements today.")).toBeInTheDocument();
  });
});
