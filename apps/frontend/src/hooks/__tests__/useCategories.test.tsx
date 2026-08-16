import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

// Mock api
const mockGet = vi.fn();
vi.mock("../../lib/api", () => ({
  api: {
    get: (...args: unknown[]) => mockGet(...args),
    post: vi.fn(),
    patch: vi.fn(),
    del: vi.fn(),
  },
}));

import { useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory } from "../useCategories";

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe("useCategories", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches categories from GET /categories and returns the list", async () => {
    const categories = [
      { id: "c1", name: "Warung Bu Siti", description: null, is_active: true },
      { id: "c2", name: "Kantin Sejahtera", description: "Main canteen", is_active: true },
    ];
    mockGet.mockResolvedValueOnce({ categories });

    const { result } = renderHook(() => useCategories(), { wrapper });

    await waitFor(() => expect(result.current.data).toEqual(categories));
    expect(mockGet).toHaveBeenCalledWith("/categories");
  });
});

describe("category mutations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("useCreateCategory posts to POST /categories", async () => {
    const mockPost = vi.fn().mockResolvedValueOnce({ category: { id: "c1" } });
    vi.mocked(useCreateCategory); // noop to keep TS happy about import
    const { result } = renderHook(() => useCreateCategory(), { wrapper });
    // reassign via re-imported api
    const { api } = await import("../../lib/api");
    (api.post as ReturnType<typeof vi.fn>).mockImplementation(mockPost);

    result.current.mutate({ name: "Warung Baru", description: null });

    await waitFor(() => expect(mockPost).toHaveBeenCalledWith("/categories", { name: "Warung Baru", description: null }));
  });

  it("useUpdateCategory patches to PATCH /categories/:id", async () => {
    const mockPatch = vi.fn().mockResolvedValueOnce({ category: { id: "c1" } });
    const { api } = await import("../../lib/api");
    (api.patch as ReturnType<typeof vi.fn>).mockImplementation(mockPatch);

    const { result } = renderHook(() => useUpdateCategory(), { wrapper });

    result.current.mutate({ id: "c1", name: "Renamed" });

    await waitFor(() => expect(mockPatch).toHaveBeenCalledWith("/categories/c1", { name: "Renamed" }));
  });

  it("useDeleteCategory deletes via DELETE /categories/:id", async () => {
    const mockDel = vi.fn().mockResolvedValueOnce({ message: "Category deactivated" });
    const { api } = await import("../../lib/api");
    (api.del as ReturnType<typeof vi.fn>).mockImplementation(mockDel);

    const { result } = renderHook(() => useDeleteCategory(), { wrapper });

    result.current.mutate("c1");

    await waitFor(() => expect(mockDel).toHaveBeenCalledWith("/categories/c1"));
  });
});
