import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Mock shared package — drizzle-orm doesn't work in jsdom
vi.mock("@dailypantry/shared", () => ({
  registerSchema: {
    safeParse: (data: any) => {
      const errors: { path: (string | number)[]; message: string }[] = [];
      if (!data.name || data.name.length < 2) {
        errors.push({ path: ["name"], message: "Name must be at least 2 characters" });
      }
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
const mockRegisterMutate = vi.fn();
vi.mock("../../hooks/useAuth", () => ({
  useAuth: () => ({ user: null, isLoading: false, isAuthenticated: false }),
  useLogin: () => ({ mutate: vi.fn(), isPending: false, isError: false, error: null }),
  useRegister: () => ({
    mutate: mockRegisterMutate,
    isPending: false,
    isError: false,
    isSuccess: false,
    error: null,
  }),
  useLogout: () => ({ mutate: vi.fn(), isPending: false }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import { RegisterPage } from "../register";

function renderRegister() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <RegisterPage />
    </QueryClientProvider>,
  );
}

describe("RegisterPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders register form with name, email, password, confirm password", () => {
    renderRegister();
    expect(screen.getByPlaceholderText(/your name/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/you@company/i)).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/at least 6 characters/i),
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/repeat password/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /register/i }),
    ).toBeInTheDocument();
  });

  it("renders login link", () => {
    renderRegister();
    expect(screen.getByText(/login/i)).toBeInTheDocument();
  });

  it("shows validation error for empty name", async () => {
    const user = userEvent.setup();
    renderRegister();

    await user.click(screen.getByRole("button", { name: /register/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/name must be at least 2/i),
      ).toBeInTheDocument();
    });
  });

  it("prevents submission with invalid email", async () => {
    const user = userEvent.setup();
    renderRegister();

    await user.type(
      screen.getByPlaceholderText(/your name/i),
      "Test User",
    );
    fireEvent.change(screen.getByPlaceholderText(/you@company/i), {
      target: { value: "notanemail" },
    });
    await user.type(
      screen.getByPlaceholderText(/at least 6 characters/i),
      "password123",
    );
    await user.type(
      screen.getByPlaceholderText(/repeat password/i),
      "password123",
    );
    await user.click(screen.getByRole("button", { name: /register/i }));

    // Client-side validation should prevent the API call
    expect(mockRegisterMutate).not.toHaveBeenCalled();
  });

  it("shows error when passwords don't match", async () => {
    const user = userEvent.setup();
    renderRegister();

    await user.type(
      screen.getByPlaceholderText(/your name/i),
      "Test User",
    );
    await user.type(
      screen.getByPlaceholderText(/you@company/i),
      "test@test.com",
    );
    await user.type(
      screen.getByPlaceholderText(/at least 6 characters/i),
      "password123",
    );
    await user.type(
      screen.getByPlaceholderText(/repeat password/i),
      "different456",
    );

    await user.click(screen.getByRole("button", { name: /register/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/passwords do not match/i),
      ).toBeInTheDocument();
    });
  });

  it("calls register mutation with valid input", async () => {
    const user = userEvent.setup();
    renderRegister();

    await user.type(
      screen.getByPlaceholderText(/your name/i),
      "Test User",
    );
    await user.type(
      screen.getByPlaceholderText(/you@company/i),
      "test@test.com",
    );
    await user.type(
      screen.getByPlaceholderText(/at least 6 characters/i),
      "password123",
    );
    await user.type(
      screen.getByPlaceholderText(/repeat password/i),
      "password123",
    );

    await user.click(screen.getByRole("button", { name: /register/i }));

    await waitFor(() => {
      expect(mockRegisterMutate).toHaveBeenCalledWith({
        name: "Test User",
        email: "test@test.com",
        password: "password123",
        role_id: "role-emp-00000000000000000001",
      });
    });
  });
});
