import { Link } from "@tanstack/react-router";
import { useAuth } from "../hooks/useAuth";
import { ProtectedRoute } from "../components/ProtectedRoute";
import { Layout } from "../components/Layout";

export function DashboardPage() {
  const { user, isLoading } = useAuth();

  return (
    <ProtectedRoute>
      <Layout>
        {isLoading ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Welcome */}
            <div className="bg-white rounded-xl p-5 shadow-sm border">
              <h2 className="text-lg font-semibold text-gray-900">Welcome, {user?.name}!</h2>
              <p className="text-sm text-gray-500 mt-1 capitalize">Role: {user?.role_name?.replace("_", " ")}</p>
            </div>

            {/* Role-specific actions */}
            {user?.role_name === "employee" && (
              <div className="bg-white rounded-xl p-5 shadow-sm border">
                <p className="text-gray-600 text-sm">Order meals from available sellers.</p>
                <p className="text-gray-400 text-xs mt-2">Meal ordering coming in Phase 2.</p>
              </div>
            )}

            {user?.role_name === "seller" && (
              <div className="space-y-3">
                <Link
                  to="/profile"
                  className="block bg-white rounded-xl p-5 shadow-sm border hover:border-blue-300 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🏪</span>
                    <div>
                      <h3 className="font-medium text-gray-900">Manage Profile</h3>
                      <p className="text-sm text-gray-500">Update store name, description, and QRIS</p>
                    </div>
                  </div>
                </Link>
                <div className="bg-white rounded-xl p-5 shadow-sm border opacity-60">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🍽️</span>
                    <div>
                      <h3 className="font-medium text-gray-900">Manage Meals</h3>
                      <p className="text-sm text-gray-500">Coming in Phase 2</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {user?.role_name === "office_boy" && (
              <div className="space-y-3">
                <Link
                  to="/users"
                  className="block bg-white rounded-xl p-5 shadow-sm border hover:border-blue-300 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">👥</span>
                    <div>
                      <h3 className="font-medium text-gray-900">Manage Users</h3>
                      <p className="text-sm text-gray-500">Add, deactivate employees and sellers</p>
                    </div>
                  </div>
                </Link>
                <div className="bg-white rounded-xl p-5 shadow-sm border opacity-60">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">📋</span>
                    <div>
                      <h3 className="font-medium text-gray-900">Today's Orders</h3>
                      <p className="text-sm text-gray-500">Coming in Phase 2</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {user?.role_name === "manager" && (
              <div className="space-y-3">
                <Link
                  to="/users"
                  className="block bg-white rounded-xl p-5 shadow-sm border hover:border-blue-300 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">👥</span>
                    <div>
                      <h3 className="font-medium text-gray-900">Manage Users</h3>
                      <p className="text-sm text-gray-500">View all employees, sellers, and office boys</p>
                    </div>
                  </div>
                </Link>
                <div className="bg-white rounded-xl p-5 shadow-sm border opacity-60">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">📊</span>
                    <div>
                      <h3 className="font-medium text-gray-900">Reports</h3>
                      <p className="text-sm text-gray-500">Coming in Phase 2</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </Layout>
    </ProtectedRoute>
  );
}
