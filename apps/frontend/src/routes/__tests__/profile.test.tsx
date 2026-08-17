import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Mock TanStack Router (ProtectedRoute uses useNavigate)
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

// Mock useAuth hooks (employee role — non-seller)
const mockUpdateProfileMutate = vi.fn();
const mockChangePasswordMutate = vi.fn();
let mockUser: {
  id: string;
  name: string;
  email: string;
  role_id: string;
  role_name: string;
  phone_no: string | null;
  avatar: string | null;
  description: string | null;
  is_active: boolean;
  blocked: boolean;
  created_at: string;
} = {
  id: "u1",
  name: "Ana",
  email: "ana@corp.com",
  role_id: "r1",
  role_name: "employee",
  phone_no: "0812-3456-7890",
  avatar: null,
  description: "Loves lunch",
  is_active: true,
  blocked: false,
  created_at: "2026-01-01",
};
vi.mock("../../hooks/useAuth", () => ({
  useAuth: () => ({ user: mockUser, isLoading: false, isAuthenticated: true }),
  useUpdateProfile: () => ({
    mutate: mockUpdateProfileMutate,
    isPending: false,
  }),
  useChangePassword: () => ({
    mutate: mockChangePasswordMutate,
    isPending: false,
  }),
  useLogout: () => ({ mutate: vi.fn(), isPending: false }),
}));

// Mock seller hooks — no seller profile for employee
vi.mock("../../hooks/useSeller", () => ({
  useSellerProfile: () => ({ data: null, isLoading: false }),
  useUpdateProfile: () => ({ mutate: vi.fn(), isPending: false, error: null }),
}));

import { ProfilePage } from "../profile";

function renderProfile() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ProfilePage />
    </QueryClientProvider>,
  );
}

describe("ProfilePage (employee)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders profile info for non-seller roles", () => {
    renderProfile();
    expect(screen.getByText("Ana")).toBeInTheDocument();
    expect(screen.getByText("ana@corp.com")).toBeInTheDocument();
    expect(screen.getByText("0812-3456-7890")).toBeInTheDocument();
  });

  it("does not show seller storefront for non-sellers", () => {
    renderProfile();
    expect(screen.queryByText(/store profile/i)).not.toBeInTheDocument();
  });

  it("shows change password form", () => {
    renderProfile();
    expect(screen.getByLabelText("Current Password")).toBeInTheDocument();
    expect(screen.getByLabelText("New Password")).toBeInTheDocument();
    expect(screen.getByLabelText("Confirm New Password")).toBeInTheDocument();
  });

  it("validates mismatched new passwords before calling API", async () => {
    const user = userEvent.setup();
    renderProfile();

    await user.type(screen.getByLabelText("Current Password"), "oldpass123");
    await user.type(screen.getByLabelText("New Password"), "newpass123");
    await user.type(screen.getByLabelText("Confirm New Password"), "different456");
    await user.click(screen.getByRole("button", { name: /change password/i }));

    await waitFor(() => {
      expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
    });
    expect(mockChangePasswordMutate).not.toHaveBeenCalled();
  });

  it("calls change password mutation with valid input", async () => {
    const user = userEvent.setup();
    renderProfile();

    await user.type(screen.getByLabelText("Current Password"), "oldpass123");
    await user.type(screen.getByLabelText("New Password"), "newpass123");
    await user.type(screen.getByLabelText("Confirm New Password"), "newpass123");
    await user.click(screen.getByRole("button", { name: /change password/i }));

    await waitFor(() => {
      expect(mockChangePasswordMutate).toHaveBeenCalledWith(
        { current_password: "oldpass123", new_password: "newpass123" },
        expect.any(Object),
      );
    });
  });

  it("opens edit profile form and submits update", async () => {
    const user = userEvent.setup();
    mockUpdateProfileMutate.mockImplementation((_data, opts) => {
      opts?.onSuccess?.();
    });
    renderProfile();

    await user.click(screen.getByRole("button", { name: /edit profile/i }));

    const nameInput = screen.getByLabelText("Name");
    await user.clear(nameInput);
    await user.type(nameInput, "Ana Updated");
    await user.click(screen.getByRole("button", { name: /^save$/i }));

    await waitFor(() => {
      expect(mockUpdateProfileMutate).toHaveBeenCalledWith(
        {
          name: "Ana Updated",
          email: "ana@corp.com",
          phone_no: "0812-3456-7890",
          description: "Loves lunch",
          avatar: undefined,
        },
        expect.any(Object),
      );
    });
  });

  it("shows avatar in read mode", () => {
    mockUser = { ...mockUser, avatar: "data:image/jpeg;base64,AVATAR" };
    renderProfile();
    const avatar = document.querySelector("img.rounded-full");
    expect(avatar).toHaveAttribute("src", "data:image/jpeg;base64,AVATAR");
    mockUser = { ...mockUser, avatar: null };
  });
});
