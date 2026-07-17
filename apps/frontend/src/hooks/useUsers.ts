import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";

export interface UserItem {
  id: string;
  name: string;
  email: string;
  phone_no: string | null;
  is_active: boolean;
  blocked: boolean;
  role_id: string;
  role_name: string;
  created_at: string;
}

interface RoleItem {
  id: string;
  name: string;
  is_active: boolean;
}

export function useUsers(roleId?: string) {
  return useQuery({
    queryKey: ["users", { roleId }],
    queryFn: () => {
      const params = roleId ? `?role_id=${roleId}` : "";
      return api.get<{ users: UserItem[] }>(`/users${params}`).then(r => r.users);
    },
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; email: string; password: string; role_id: string; phone_no?: string }) =>
      api.post<{ user: UserItem }>("/users", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; is_active?: boolean; name?: string; email?: string; phone_no?: string }) =>
      api.patch(`/users/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

export function useRoles() {
  return useQuery({
    queryKey: ["roles"],
    queryFn: () => api.get<{ roles: RoleItem[] }>("/users/roles").then(r => r.roles),
  });
}
