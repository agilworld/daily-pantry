import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { MEAL_CATEGORIES } from "@dailypantry/shared";

export interface Meal {
  id: string;
  seller_id: string;
  name: string;
  description: string | null;
  price_cents: number;
  category: string;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
}

export function useMeals(category?: string) {
  return useQuery({
    queryKey: ["meals", { category }],
    queryFn: () => api.get<{ meals: Meal[] }>(`/meals${category ? `?category=${category}` : ""}`).then(r => r.meals),
    staleTime: 2 * 60 * 1000,
  });
}

export function useCreateMeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; description?: string; price_cents: number; category: string; image_url?: string }) =>
      api.post<{ meal: Meal }>("/meals", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["meals"] }),
  });
}

export function useUpdateMeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Partial<{ name: string; description?: string; price_cents: number; category: string; image_url?: string; is_active: boolean }>) =>
      api.patch<{ meal: Meal }>(`/meals/${id}`, data),
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
