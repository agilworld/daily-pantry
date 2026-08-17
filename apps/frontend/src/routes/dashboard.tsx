import { Link } from "@tanstack/react-router";
import { useAuth } from "../hooks/useAuth";
import {
  useMyOrders,
  useAcceptOrder,
  useCancelOrder,
  type Order,
} from "../hooks/useOrders";
import { useNotes } from "../hooks/useNotes";
import { ProtectedRoute } from "../components/ProtectedRoute";
import { Layout } from "../components/Layout";

const ORDER_STATUS_LABELS: Record<string, string> = {
  placed: "Placed",
  confirmed: "Confirmed",
  ready: "Ready",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const ORDER_STATUS_COLORS: Record<string, string> = {
  placed: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  ready: "bg-green-100 text-green-800",
  delivered: "bg-gray-100 text-gray-800",
  cancelled: "bg-red-100 text-red-800",
};

function formatIDR(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value);
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

// --- My Orders section (all roles) ---

function MyOrdersSection() {
  const { data: orders, isLoading } = useMyOrders();
  const acceptOrder = useAcceptOrder();
  const cancelOrder = useCancelOrder();

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl p-5 shadow-sm border">
        <div className="h-4 bg-gray-200 rounded w-1/3 mb-3 animate-pulse" />
        <div className="h-3 bg-gray-200 rounded w-full mb-2 animate-pulse" />
        <div className="h-3 bg-gray-200 rounded w-2/3 animate-pulse" />
      </div>
    );
  }

  const myOrders = orders ?? [];

  return (
    <section className="bg-white rounded-xl p-5 shadow-sm border">
      <h3 className="font-semibold text-gray-900 mb-3">My Orders</h3>
      {myOrders.length === 0 ? (
        <p className="text-sm text-gray-500">No orders yet.</p>
      ) : (
        <div className="space-y-3">
          {myOrders.map((order: Order) => (
            <div
              key={order.id}
              className="border border-gray-100 rounded-lg p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 text-sm truncate">
                    {order.meal_name}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {order.quantity}x &middot; {formatIDR(order.total_cents)}
                  </p>
                  {order.notes && (
                    <p className="text-xs text-gray-400 italic truncate mt-1">
                      &ldquo;{order.notes}&rdquo;
                    </p>
                  )}
                </div>
                <span
                  className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-medium ${
                    ORDER_STATUS_COLORS[order.status] ?? "bg-gray-100 text-gray-600"
                  }`}
                >
                  {ORDER_STATUS_LABELS[order.status] ?? order.status}
                </span>
              </div>

              {/* Accept — delivered order that hasn't been accepted yet */}
              {order.status === "delivered" && order.accepted_at === null && (
                <button
                  onClick={() => acceptOrder.mutate(order.id)}
                  disabled={acceptOrder.isPending}
                  className="mt-2 w-full bg-blue-600 text-white text-sm py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {acceptOrder.isPending ? "Accepting..." : "Accept"}
                </button>
              )}
              {order.status === "delivered" && order.accepted_at !== null && (
                <p className="mt-2 text-xs font-medium text-green-600">
                  ✓ Accepted
                </p>
              )}

              {/* Cancel — only while the order is still placed */}
              {order.status === "placed" && (
                <button
                  onClick={() => cancelOrder.mutate({ id: order.id })}
                  disabled={cancelOrder.isPending}
                  className="mt-2 w-full border border-red-300 text-red-600 text-sm py-2 rounded-lg font-medium hover:bg-red-50 disabled:opacity-50 transition-colors"
                >
                  Cancel
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

// --- Today's Note section (all roles) ---

function TodaysNoteSection() {
  const { data: notes, isLoading } = useNotes(todayISO());

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl p-5 shadow-sm border">
        <div className="h-4 bg-gray-200 rounded w-1/3 mb-3 animate-pulse" />
        <div className="h-3 bg-gray-200 rounded w-2/3 animate-pulse" />
      </div>
    );
  }

  // Backend returns notes newest-first; pick the most recent broadcast note.
  const latest = (notes ?? []).find((n) => n.is_broadcast);

  return (
    <section className="bg-white rounded-xl p-5 shadow-sm border">
      <h3 className="font-semibold text-gray-900 mb-2">Today&rsquo;s Note</h3>
      {latest ? (
        <>
          <p className="text-sm text-gray-800">{latest.content}</p>
          <p className="text-xs text-gray-400 mt-2">
            {latest.author_name} &middot;{" "}
            {new Date(latest.created_at).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </>
      ) : (
        <p className="text-sm text-gray-500">No announcements today.</p>
      )}
    </section>
  );
}

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
              <div className="space-y-3">
                <Link
                  to="/order"
                  className="block bg-white rounded-xl p-5 shadow-sm border hover:border-blue-300 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🍽️</span>
                    <div>
                      <h3 className="font-medium text-gray-900">Order Meals</h3>
                      <p className="text-sm text-gray-500">Browse the catalog and place an order</p>
                    </div>
                  </div>
                </Link>
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
                <Link
                  to="/menu"
                  className="block bg-white rounded-xl p-5 shadow-sm border hover:border-blue-300 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">📋</span>
                    <div>
                      <h3 className="font-medium text-gray-900">Manage Meals</h3>
                      <p className="text-sm text-gray-500">Add, edit, and toggle meal availability</p>
                    </div>
                  </div>
                </Link>
                <Link
                  to="/fulfillment"
                  className="block bg-white rounded-xl p-5 shadow-sm border hover:border-blue-300 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">📦</span>
                    <div>
                      <h3 className="font-medium text-gray-900">View Orders</h3>
                      <p className="text-sm text-gray-500">Track orders for your meals</p>
                    </div>
                  </div>
                </Link>
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
                <Link
                  to="/menu"
                  className="block bg-white rounded-xl p-5 shadow-sm border hover:border-blue-300 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">📋</span>
                    <div>
                      {/* Office boy manages the meal menu — it's not their personal ordering page */}
                      <h3 className="font-medium text-gray-900">Meals</h3>
                      <p className="text-sm text-gray-500">Manage the meal menu and availability</p>
                    </div>
                  </div>
                </Link>
                <Link
                  to="/fulfillment"
                  className="block bg-white rounded-xl p-5 shadow-sm border hover:border-blue-300 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">📦</span>
                    <div>
                      <h3 className="font-medium text-gray-900">Manage Orders</h3>
                      <p className="text-sm text-gray-500">Confirm, mark ready, and deliver orders</p>
                    </div>
                  </div>
                </Link>
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
                <Link
                  to="/notes"
                  className="block bg-white rounded-xl p-5 shadow-sm border hover:border-blue-300 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">📝</span>
                    <div>
                      <h3 className="font-medium text-gray-900">Notes</h3>
                      <p className="text-sm text-gray-500">View announcements and updates</p>
                    </div>
                  </div>
                </Link>
                <Link
                  to="/order"
                  className="block bg-white rounded-xl p-5 shadow-sm border hover:border-blue-300 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🍽️</span>
                    <div>
                      <h3 className="font-medium text-gray-900">Order Meals</h3>
                      <p className="text-sm text-gray-500">Browse the catalog and place an order</p>
                    </div>
                  </div>
                </Link>
              </div>
            )}

            {/* Today's Note — all roles */}
            <TodaysNoteSection />

            {/* My Orders tracking — all roles */}
            <MyOrdersSection />
          </div>
        )}
      </Layout>
    </ProtectedRoute>
  );
}
