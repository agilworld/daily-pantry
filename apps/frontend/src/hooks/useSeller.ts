import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";

export interface SellerProfile {
  id: string;
  name: string;
  email: string;
  description: string | null;
  qris_image: string | null;
  created_at: string;
  updated_at: string | null;
}

export function useSellerProfile() {
  return useQuery({
    queryKey: ["seller", "profile"],
    queryFn: () =>
      api.get<{ profile: SellerProfile }>("/sellers/profile").then((r) => r.profile),
    retry: false,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name?: string; description?: string; qris_image?: string }) =>
      api.put<{ profile: SellerProfile }>("/sellers/profile", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seller", "profile"] });
    },
  });
}
