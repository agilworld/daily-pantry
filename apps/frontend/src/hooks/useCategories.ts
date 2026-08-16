import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";

export interface Category {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
}

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: () =>
      api.get<{ categories: Category[] }>("/categories").then((r) => r.categories),
    staleTime: 2 * 60 * 1000,
  });
}

/** Office boy only — create a food store category. */
export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; description?: string | null }) =>
      api.post<{ category: Category }>("/categories", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categories"] }),
  });
}

/** Office boy only — update a food store category. */
export function useUpdateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: { id: string } & Partial<{ name: string; description?: string | null }>) =>
      api.patch<{ category: Category }>(`/categories/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categories"] }),
  });
}

/** Office boy only — soft-deactivate a food store category. */
export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del(`/categories/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categories"] }),
  });
}
