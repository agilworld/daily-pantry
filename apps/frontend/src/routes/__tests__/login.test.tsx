import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Mock shared package — drizzle-orm doesn't work in jsdom
vi.mock("@dailypantry/shared", () => ({
  loginSchema: {
    safeParse: (data: any) => {
      const errors: { path: (string | number)[]; message: string }[] = [];
      if (!data.email || !data.email.includes("@")) {
        errors.push({ path: ["email"], message: "Invalid email format" });
      }
      if (!data.password || data.password.length < 6) {
        errors.push({ path: ["password"], message: "Password must be at least 6 characters" });
      }
      if (errors.length > 0) {
        return { success: false as const, error: { errors, flatten: () => ({ fieldErrors: {} }) } };
      }
      return { success: true as const, data };
    },
  },
}));

// Mock TanStack Router Link to avoid router context requirement
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
}));

// Mock useAuth hooks
const mockLoginMutate = vi.fn();
vi.mock("../../hooks/useAuth", () => ({
  useAuth: () => ({ user: null, isLoading: false, isAuthenticated: false }),
  useLogin: () => ({
    mutate: mockLoginMutate,
    isPending: false,
    isError: false,
    error: null,
  }),
  useRegister: () => ({
    mutate: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
  }),
  useLogout: () => ({ mutate: vi.fn(), isPending: false }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import { LoginPage } from "../login";

function renderLogin() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <LoginPage />
    </QueryClientProvider>,
  );
}

describe("LoginPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders login form with email, password, and submit button", () => {
    renderLogin();
    expect(
      screen.getByPlaceholderText(/you@company/i),
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/••••••/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /login/i }),
    ).toBeInTheDocument();
  });

  it("renders register link", () => {
    renderLogin();
    expect(screen.getByText(/register/i)).toBeInTheDocument();
  });

  it("shows validation error for empty email", async () => {
    const user = userEvent.setup();
    renderLogin();

    await user.click(screen.getByRole("button", { name: /login/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/invalid email format/i),
      ).toBeInTheDocument();
    });
  });

  it("shows validation error for short password", async () => {
    const user = userEvent.setup();
    renderLogin();

    await user.type(
      screen.getByPlaceholderText(/you@company/i),
      "test@test.com",
    );
    await user.click(screen.getByRole("button", { name: /login/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/at least 6 characters/i),
      ).toBeInTheDocument();
    });
  });

  it("calls login mutation with valid input", async () => {
    const user = userEvent.setup();
    renderLogin();

    await user.type(
      screen.getByPlaceholderText(/you@company/i),
      "test@test.com",
    );
    await user.type(
      screen.getByPlaceholderText(/••••••/i),
      "password123",
    );
    await user.click(screen.getByRole("button", { name: /login/i }));

    await waitFor(() => {
      expect(mockLoginMutate).toHaveBeenCalledWith({
        email: "test@test.com",
        password: "password123",
      });
    });
  });
});
