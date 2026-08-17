import { createContext, useContext, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate } from "@tanstack/react-router";
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
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const { data: user, isLoading } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => {
      // Read localStorage reactively inside the query so the enabled
      // state isn't captured in a stale closure at mount time.
      if (localStorage.getItem("dp_has_session") !== "true") {
        return null;
      }
      return api.get<{ user: AuthUser }>("/auth/me").then((r) => r.user);
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const isAuthenticated = !!user;

  // Drive redirects reactively from auth state instead of imperative
  // navigate() inside mutation callbacks. Router navigation and the React
  // Query cache are separate stores and don't batch, so navigating in
  // useLogin/useLogout onSuccess raced the AuthProvider re-render (login
  // bounced back to /login via ProtectedRoute; logout kept stale nav).
  // Mutations only mutate state; this effect reacts to the state change.
  useEffect(() => {
    if (isLoading) return;
    const onAuthPage =
      location.pathname === "/login" || location.pathname === "/register";
    if (isAuthenticated && onAuthPage) {
      // Logged in but on login/register → go to dashboard
      navigate({ to: "/dashboard" });
    } else if (!isAuthenticated && !onAuthPage && location.pathname !== "/") {
      // Not logged in and on a protected page → go to login
      navigate({ to: "/login" });
    }
  }, [isAuthenticated, isLoading, location.pathname, navigate]);

  const value = useMemo(
    () => ({
      user: user ?? null,
      isLoading,
      isAuthenticated,
    }),
    [user, isLoading, isAuthenticated],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { email: string; password: string }) =>
      api.post<{ user: AuthUser }>("/auth/login", data),
    onSuccess: (data) => {
      // Persist session flag + cached user so a refresh keeps the user logged in.
      // setQueryData seeds the cache directly — no race with invalidateQueries
      // (the ["auth", "me"] query is always-enabled now, so a failed/disabled
      // refetch can no longer clobber the freshly-written value).
      // No navigate() here — AuthProvider's effect redirects to /dashboard
      // reactively once isAuthenticated flips true.
      setAuthStorage();
      queryClient.setQueryData(["auth", "me"], data.user ?? null);
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

  return useMutation({
    mutationFn: () => api.post("/auth/logout", {}),
    onSuccess: () => {
      // Remove only the app-owned auth keys (never localStorage.clear()).
      clearAuthStorage();
      // Clear ALL cached server state so no stale data survives the session.
      queryClient.clear();
      // Then seed auth as null (not authenticated, not loading) so the
      // AuthProvider effect redirects to /login reactively. Seeding AFTER
      // clear() avoids a spinner-on-logout: clear() removes ["auth","me"]
      // entirely, which would leave user=undefined and isLoading=true.
      queryClient.setQueryData(["auth", "me"], null);
      // No navigate() here — AuthProvider effect redirects to /login reactively.
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
