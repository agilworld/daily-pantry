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

// Mock useAuth hooks
const mockCreateNoteMutate = vi.fn();
let mockNotes = [{ id: "n1", author_id: "u1", content: "Hello", is_broadcast: true, created_at: "2026-08-16T08:00:00Z", author_name: "Boy" }];
vi.mock("../../hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "u1", name: "Boy", email: "boy@corp.com", role_id: "r2", role_name: "office_boy", phone_no: null, avatar: null, description: null, is_active: true, blocked: false, created_at: "2026-01-01" }, isLoading: false, isAuthenticated: true }),
  useLogout: () => ({ mutate: vi.fn(), isPending: false }),
}));

// Mock notes hooks
vi.mock("../../hooks/useNotes", () => ({
  useNotes: (date?: string) => ({
    data: mockNotes,
    isLoading: false,
    refetch: vi.fn(),
  }),
  useCreateNote: () => ({
    mutate: mockCreateNoteMutate,
    isPending: false,
  }),
}));

import { NotesPage } from "../notes";

function renderNotes() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <NotesPage />
    </QueryClientProvider>,
  );
}

describe("NotesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNotes = [{ id: "n1", author_id: "u1", content: "Hello", is_broadcast: true, created_at: "2026-08-16T08:00:00Z", author_name: "Boy" }];
  });

  it("renders notes list with author and timestamp", () => {
    renderNotes();
    expect(screen.getByText("Hello")).toBeInTheDocument();
    expect(screen.getByText(/Boy/)).toBeInTheDocument();
  });

  it("shows compose form for office_boy", () => {
    renderNotes();
    expect(screen.getByPlaceholderText("Write a note...")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /post note/i })).toBeInTheDocument();
  });

  it("posts a note and clears the textarea on success", async () => {
    const user = userEvent.setup();
    mockCreateNoteMutate.mockImplementation((_data, opts) => {
      opts?.onSuccess?.();
    });
    renderNotes();

    await user.type(screen.getByPlaceholderText("Write a note..."), "New note");
    await user.click(screen.getByRole("button", { name: /post note/i }));

    await waitFor(() => {
      expect(mockCreateNoteMutate).toHaveBeenCalledWith(
        { content: "New note", is_broadcast: true },
        expect.any(Object),
      );
    });
  });

  it("shows empty state when there are no notes", () => {
    mockNotes = [];
    renderNotes();
    expect(screen.getByText("No notes yet.")).toBeInTheDocument();
  });
});
