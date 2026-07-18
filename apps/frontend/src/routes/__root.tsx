import { Outlet, Link } from "@tanstack/react-router";
import { AuthProvider, useAuth, useLogout } from "../hooks/useAuth";

function AppShell() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const logout = useLogout();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-900">Daily Pantry</h1>
          {isAuthenticated && user && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600">{user.name}</span>
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                {user.role_name}
              </span>
              <button
                onClick={() => logout.mutate()}
                className="text-sm text-red-500 hover:text-red-700"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6">
        <Outlet />
      </main>

      {isAuthenticated && user && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg">
          <div className="max-w-lg mx-auto flex justify-around py-2">
            <Link
              to="/dashboard"
              className="flex flex-col items-center text-xs text-gray-600 hover:text-blue-600 [&.active]:text-blue-600"
            >
              <span className="text-xl">🏠</span>
              <span>Home</span>
            </Link>
            {(user.role_name === "office_boy" || user.role_name === "manager") && (
              <Link
                to="/users"
                className="flex flex-col items-center text-xs text-gray-600 hover:text-blue-600 [&.active]:text-blue-600"
              >
                <span className="text-xl">👥</span>
                <span>Users</span>
              </Link>
            )}
            {user.role_name === "employee" && (
              <Link
                to="/order"
                className="flex flex-col items-center text-xs text-gray-600 hover:text-blue-600 [&.active]:text-blue-600"
              >
                <span className="text-xl">🍽️</span>
                <span>Order</span>
              </Link>
            )}
            {user.role_name === "seller" && (
              <Link
                to="/menu"
                className="flex flex-col items-center text-xs text-gray-600 hover:text-blue-600 [&.active]:text-blue-600"
              >
                <span className="text-xl">📋</span>
                <span>Menu</span>
              </Link>
            )}
            {user.role_name === "seller" && (
              <Link
                to="/profile"
                className="flex flex-col items-center text-xs text-gray-600 hover:text-blue-600 [&.active]:text-blue-600"
              >
                <span className="text-xl">🏪</span>
                <span>Store</span>
              </Link>
            )}
            {user.role_name === "office_boy" && (
              <Link
                to="/fulfillment"
                className="flex flex-col items-center text-xs text-gray-600 hover:text-blue-600 [&.active]:text-blue-600"
              >
                <span className="text-xl">📦</span>
                <span>Fulfill</span>
              </Link>
            )}
          </div>
        </nav>
      )}
    </div>
  );
}

export function RootComponent() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}
