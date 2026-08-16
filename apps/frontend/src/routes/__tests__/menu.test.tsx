import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Mock TanStack Router (ProtectedRoute + RoleGuard use useNavigate)
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to, className }: { children: React.ReactNode; to: string; className?: string }) => (
    <a href={to} className={className}>{children}</a>
  ),
  useNavigate: () => vi.fn(),
}));

// Mock useAuth — office boy is allowed on the menu page and can manage categories
vi.mock("../../hooks/useAuth", () => ({
  useAuth: () => ({
    user: {
      id: "u1",
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

// Mock meal hooks
const mockToggle = vi.fn();
const mockDeleteMeal = vi.fn();
vi.mock("../../hooks/useMeals", () => ({
  useMeals: () => ({
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
        seller_id: "s1",
        name: "Mie Ayam",
        description: null,
        price_cents: 12000,
        category_id: null,
        category_name: null,
        is_active: true,
        created_at: "2026-08-16T08:00:00Z",
        updated_at: null,
      },
    ],
    isLoading: false,
  }),
  useCreateMeal: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdateMeal: () => ({ mutate: vi.fn(), isPending: false }),
  useToggleAvailable: () => ({ mutate: mockToggle, isPending: false }),
  useDeleteMeal: () => ({ mutate: mockDeleteMeal, isPending: false }),
  type: {},
}));

// Mock category hooks — office boy sees "Manage Food Stores"
const mockCreateCategory = vi.fn();
const mockUpdateCategory = vi.fn();
const mockDeleteCategory = vi.fn();
vi.mock("../../hooks/useCategories", () => ({
  useCategories: () => ({
    data: [
      { id: "c1", name: "Warung Bu Siti", description: null, is_active: true },
      { id: "c2", name: "Kantin Sejahtera", description: "Main canteen", is_active: true },
    ],
    isLoading: false,
  }),
  useCreateCategory: () => ({ mutate: mockCreateCategory, isPending: false }),
  useUpdateCategory: () => ({ mutate: mockUpdateCategory, isPending: false }),
  useDeleteCategory: () => ({ mutate: mockDeleteCategory, isPending: false }),
  type: {},
}));

// Mock shared package (createMealSchema is used in the meal form)
vi.mock("@dailypantry/shared", () => ({
  createMealSchema: {
    safeParse: (data: any) => ({ success: true as const, data }),
  },
}));

import { MenuPage } from "../menu";

function renderMenu() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MenuPage />
    </QueryClientProvider>,
  );
}

describe("MenuPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders meals with category_name badge from food store", () => {
    renderMenu();
    expect(screen.getByText("Nasi Goreng")).toBeInTheDocument();
    // The food store name appears on the meal card badge (and in the filter select / manage section)
    expect(screen.getAllByText("Warung Bu Siti").length).toBeGreaterThan(0);
  });

  it("shows Manage Food Stores section for office boy", () => {
    renderMenu();
    expect(screen.getByText("Manage Food Stores")).toBeInTheDocument();
    expect(screen.getAllByText("Kantin Sejahtera").length).toBeGreaterThan(0);
  });

  it("offers None (own-selling) option in the meal category select", async () => {
    const user = userEvent.setup();
    renderMenu();

    await user.click(screen.getByRole("button", { name: /add meal/i }));

    // Two comboboxes: the page filter and the modal's food store select
    const selects = screen.getAllByRole("combobox");
    expect(selects).toHaveLength(2);
    expect(screen.getByText("None (own-selling)")).toBeInTheDocument();
  });
});
