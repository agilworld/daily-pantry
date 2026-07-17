import { createContext, useContext, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { api } from "../lib/api";

export interface AuthUser {
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
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const hasSession = localStorage.getItem("has_session") === "true";
  const { data: user, isLoading } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: () =>
      api.get<{ user: AuthUser }>("/auth/me").then((r) => r.user),
    enabled: hasSession,
    retry: false,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const value = useMemo(
    () => ({
      user: user ?? null,
      isLoading,
      isAuthenticated: !!user,
    }),
    [user, isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

export function useLogin() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (data: { email: string; password: string }) =>
      api.post<{ user: AuthUser }>("/auth/login", data),
    onSuccess: () => {
      localStorage.setItem("has_session", "true");
      queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      navigate({ to: "/dashboard" });
    },
  });
}

export function useRegister() {
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (data: {
      name: string;
      email: string;
      password: string;
      role_id: string;
    }) => api.post<{ user: AuthUser }>("/auth/register", data),
    onSuccess: () => {
      navigate({ to: "/login" });
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: () => api.post("/auth/logout", {}),
    onSuccess: () => {
      localStorage.removeItem("has_session");
      queryClient.clear();
      navigate({ to: "/login" });
    },
  });
}
