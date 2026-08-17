import { createContext, useContext, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { api } from "../lib/api";

// Namespaced auth keys the app owns in localStorage.
// Logout removes ONLY these keys — never localStorage.clear() (could nuke unrelated PWA data).
export const AUTH_STORAGE_KEYS = ["dp_has_session", "dp_auth_user"] as const;

export function setAuthStorage() {
  localStorage.setItem("dp_has_session", "true");
}

export function clearAuthStorage() {
  for (const key of AUTH_STORAGE_KEYS) {
    localStorage.removeItem(key);
  }
}

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
  const hasSession = localStorage.getItem("dp_has_session") === "true";
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
    onSuccess: (data) => {
      // Persist session flag + cached user so a refresh keeps the user logged in.
      setAuthStorage();
      if (data.user) {
        queryClient.setQueryData(["auth", "me"], data.user);
      }
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
      // Clear ALL cached server state first so no stale data survives the session.
      queryClient.clear();
      // Then remove only the app-owned auth keys (never localStorage.clear()).
      clearAuthStorage();
      navigate({ to: "/login" });
    },
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name?: string; phone_no?: string; description?: string; avatar?: string }) =>
      api.put<{ user: AuthUser }>("/users/me", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["auth", "me"] }),
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (data: { current_password: string; new_password: string }) =>
      api.post<{ message: string }>("/auth/change-password", data),
  });
}
