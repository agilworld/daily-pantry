import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
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
let mockNotes: Array<{
  id: string;
  author_id: string;
  content: string;
  is_broadcast: boolean;
  image: string | null;
  link_url: string | null;
  created_at: string;
  author_name: string;
  author_avatar: string | null;
}> = [];
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

const baseNote = {
  id: "n1",
  author_id: "u1",
  content: "Hello",
  is_broadcast: true,
  image: null,
  link_url: null,
  created_at: "2026-08-16T08:00:00Z",
  author_name: "Boy",
  author_avatar: null,
};

describe("NotesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNotes = [{ ...baseNote }];
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
        { content: "New note", is_broadcast: true, image: undefined, link_url: undefined },
        expect.any(Object),
      );
    });
    await waitFor(() => {
      expect(screen.getByPlaceholderText("Write a note...")).toHaveValue("");
    });
  });

  it("disables submit when content, image, and link are all empty", () => {
    mockNotes = [];
    renderNotes();
    expect(screen.getByRole("button", { name: /post note/i })).toBeDisabled();
  });

  it("submits a link URL and renders it as a clickable link", async () => {
    const user = userEvent.setup();
    mockCreateNoteMutate.mockImplementation((_data, opts) => {
      opts?.onSuccess?.();
    });
    mockNotes = [
      { ...baseNote, content: "Lunch deal", link_url: "https://example.com/menu" },
    ];
    renderNotes();

    // The stored note link is displayed clickable
    const anchor = screen.getByRole("link", { name: /https:\/\/example\.com\/menu/ });
    expect(anchor).toHaveAttribute("href", "https://example.com/menu");
    expect(anchor).toHaveAttribute("target", "_blank");
    expect(anchor).toHaveAttribute("rel", "noopener noreferrer");

    // Posting a note with a link URL includes it in the payload
    const urlInput = screen.getByPlaceholderText(/optional link/i);
    await user.type(urlInput, "https://example.com/deal");
    await user.click(screen.getByRole("button", { name: /post note/i }));

    await waitFor(() => {
      expect(mockCreateNoteMutate).toHaveBeenCalledWith(
        {
          content: "",
          is_broadcast: true,
          image: undefined,
          link_url: "https://example.com/deal",
        },
        expect.any(Object),
      );
    });
  });

  it("rejects an invalid link URL with an error", async () => {
    const user = userEvent.setup();
    renderNotes();

    await user.type(screen.getByPlaceholderText(/optional link/i), "not-a-url");
    await user.click(screen.getByRole("button", { name: /post note/i }));

    expect(screen.getByText(/enter a valid link/i)).toBeInTheDocument();
    expect(mockCreateNoteMutate).not.toHaveBeenCalled();
  });

  it("renders a note image", () => {
    mockNotes = [
      { ...baseNote, content: "Menu", image: "data:image/png;base64,AAAA" },
    ];
    renderNotes();
    expect(screen.getByAltText("Note attachment")).toHaveAttribute(
      "src",
      "data:image/png;base64,AAAA",
    );
  });

  it("renders the author avatar on a note card", () => {
    mockNotes = [
      { ...baseNote, author_avatar: "data:image/jpeg;base64,AVATAR" },
    ];
    renderNotes();
    const avatars = document.querySelectorAll("img.rounded-full");
    expect(avatars.length).toBeGreaterThan(0);
    expect(avatars[0]).toHaveAttribute("src", "data:image/jpeg;base64,AVATAR");
  });

  it("shows image error for non-image file type", () => {
    const { container } = renderNotes();

    const file = new File(["nope"], "file.txt", { type: "text/plain" });
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });

    expect(screen.getByText(/jpeg, png, webp, or gif/i)).toBeInTheDocument();
  });

  it("shows image error for files over 10MB", async () => {
    const user = userEvent.setup();
    renderNotes();

    const big = new File([new ArrayBuffer(10 * 1024 * 1024 + 1)], "big.png", {
      type: "image/png",
    });
    await user.upload(screen.getByLabelText(/attach image/i), big);

    expect(screen.getByText(/image must be under 10mb/i)).toBeInTheDocument();
  });

  it("opens emoji picker and appends an emoji to the textarea", async () => {
    const user = userEvent.setup();
    renderNotes();

    await user.click(screen.getByRole("button", { name: /open emoji picker/i }));
    const emojiButton = screen.getByRole("button", { name: "Add 😀" });
    await user.click(emojiButton);

    expect(screen.getByPlaceholderText("Write a note...")).toHaveValue("😀");
  });

  it("shows empty state when there are no notes", () => {
    mockNotes = [];
    renderNotes();
    expect(screen.getByText("No notes yet.")).toBeInTheDocument();
  });
});
