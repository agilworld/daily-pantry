import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";

export interface Meal {
  id: string;
  seller_id: string;
  name: string;
  description: string | null;
  price_cents: number;
  category_id: string | null;
  category_name?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
}

export function useMeals(categoryId?: string) {
  return useQuery({
    queryKey: ["meals", { categoryId }],
    queryFn: () =>
      api
        .get<{ meals: Meal[] }>(`/meals${categoryId ? `?category_id=${categoryId}` : ""}`)
        .then((r) => r.meals),
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Public catalog: active meals for ordering (all authenticated roles).
 * Hits GET /meals/active which is seller-agnostic and returns only is_active meals.
 */
export function useActiveMeals(categoryId?: string) {
  return useQuery({
    queryKey: ["meals", "active", { categoryId }],
    queryFn: () =>
      api
        .get<{ meals: Meal[] }>(`/meals/active${categoryId ? `?category_id=${categoryId}` : ""}`)
        .then((r) => r.meals),
    staleTime: 2 * 60 * 1000,
  });
}

export function useCreateMeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      name: string;
      description?: string;
      price_cents: number;
      category_id: string | null;
      image_url?: string;
    }) => api.post<{ meal: Meal }>("/meals", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["meals"] }),
  });
}

export function useUpdateMeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: { id: string } & Partial<{
      name: string;
      description?: string;
      price_cents: number;
      category_id: string | null;
      image_url?: string;
      is_active: boolean;
    }>) => api.patch<{ meal: Meal }>(`/meals/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["meals"] }),
  });
}

export function useToggleAvailable() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.patch<{ meal: Meal }>(`/meals/${id}/toggle`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["meals"] }),
  });
}

export function useDeleteMeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del(`/meals/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["meals"] }),
  });
}
