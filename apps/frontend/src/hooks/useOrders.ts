import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";

export interface Order {
  id: string;
  order_no: string;
  seller_id: string;
  employee_id: string;
  meal_id: string;
  meal_name: string;
  meal_price_cents: number;
  quantity: number;
  total_cents: number;
  status: "placed" | "confirmed" | "ready" | "delivered" | "cancelled";
  notes: string | null;
  fulfillment_notes: string | null;
  order_date: string;
  placed_at: string;
  confirmed_at: string | null;
  ready_at: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
}

export function useMyOrders() {
  return useQuery({
    queryKey: ["orders", "my"],
    queryFn: () => api.get<{ orders: Order[] }>("/orders/my").then(r => r.orders),
    staleTime: 30 * 1000,
  });
}

export function useSellerOrders() {
  return useQuery({
    queryKey: ["orders", "seller"],
    queryFn: () => api.get<{ orders: Order[] }>("/orders/seller").then(r => r.orders),
    staleTime: 30 * 1000,
  });
}

export function useReadyOrders() {
  return useQuery({
    queryKey: ["orders", "ready"],
    queryFn: () => api.get<{ orders: Order[] }>("/orders/ready").then(r => r.orders),
    staleTime: 30 * 1000,
  });
}

export function usePlaceOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { meal_id: string; quantity: number; notes?: string }) =>
      api.post<{ order: Order }>("/orders", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["orders", "my"] }),
  });
}

export function useConfirmOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.patch<{ order: Order }>(`/orders/${id}/confirm`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["orders", "seller"] }),
  });
}

export function useReadyOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, fulfillment_notes }: { id: string; fulfillment_notes?: string }) =>
      api.patch<{ order: Order }>(`/orders/${id}/ready`, { fulfillment_notes }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders", "seller"] });
      qc.invalidateQueries({ queryKey: ["orders", "ready"] });
    },
  });
}

export function useDeliverOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, fulfillment_notes }: { id: string; fulfillment_notes?: string }) =>
      api.patch<{ order: Order }>(`/orders/${id}/deliver`, { fulfillment_notes }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["orders", "ready"] }),
  });
}

export function useCancelOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, fulfillment_notes }: { id: string; fulfillment_notes?: string }) =>
      api.patch<{ order: Order }>(`/orders/${id}/cancel`, { fulfillment_notes }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["orders"] }),
  });
}

// ponytail: enable conditionally when only managers should see all orders
export function useAllOrders(enabled = true) {
  return useQuery({
    queryKey: ["orders", "all"],
    queryFn: () => api.get<{ orders: Order[] }>("/orders").then(r => r.orders),
    staleTime: 30 * 1000,
    enabled,
  });
}
