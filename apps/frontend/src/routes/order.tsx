import { useState } from "react";
import { ProtectedRoute } from "../components/ProtectedRoute";
import { RoleGuard } from "../components/RoleGuard";
import { Layout } from "../components/Layout";
import { useMeals } from "../hooks/useMeals";
import { usePlaceOrder, useMyOrders } from "../hooks/useOrders";
import { MEAL_CATEGORIES } from "@dailypantry/shared";

const STATUS_STYLES: Record<string, string> = {
  placed: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  ready: "bg-green-100 text-green-800",
  delivered: "bg-gray-100 text-gray-800",
  cancelled: "bg-red-100 text-red-800",
};

function formatIDR(cents: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(cents);
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function OrderPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>(MEAL_CATEGORIES[0]);
  const { data: meals, isLoading: mealsLoading } = useMeals(selectedCategory);
  const { data: orders } = useMyOrders();

  const [modalMeal, setModalMeal] = useState<{
    id: string;
    name: string;
    price_cents: number;
  } | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");

  const placeOrder = usePlaceOrder();
  const activeMeals = meals?.filter((m) => m.is_active);

  const openModal = (meal: { id: string; name: string; price_cents: number }) => {
    setModalMeal(meal);
    setQuantity(1);
    setNotes("");
  };

  const handleOrder = () => {
    if (!modalMeal) return;
    placeOrder.mutate(
      { meal_id: modalMeal.id, quantity, notes: notes || undefined },
      { onSuccess: () => setModalMeal(null) },
    );
  };

  return (
    <ProtectedRoute>
      <RoleGuard allowedRoles={["employee"]}>
        <Layout title="Order Meals">
          <div className="space-y-6">
            {/* Category Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {MEAL_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                    selectedCategory === cat
                      ? "bg-blue-600 text-white shadow-sm"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {capitalize(cat)}
                </button>
              ))}
            </div>

            {/* Meal Cards */}
            {mealsLoading ? (
              <div className="flex justify-center py-10">
                <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
              </div>
            ) : meals && meals.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {meals.map((meal) => {
                  const available = activeMeals?.some((m) => m.id === meal.id) ?? meal.is_active;
                  return (
                    <div
                      key={meal.id}
                      className="bg-white rounded-xl p-4 shadow-sm border flex flex-col"
                    >
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 text-sm leading-snug">
                          {meal.name}
                        </h3>
                        <p className="text-blue-600 font-bold mt-1">
                          {formatIDR(meal.price_cents)}
                        </p>
                        <span className="inline-block mt-1.5 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                          {capitalize(meal.category)}
                        </span>
                        <p
                          className={`text-xs mt-2 flex items-center gap-1 ${
                            available ? "text-green-600" : "text-red-500"
                          }`}
                        >
                          <span
                            className={`inline-block w-1.5 h-1.5 rounded-full ${
                              available ? "bg-green-500" : "bg-red-400"
                            }`}
                          />
                          {available ? "Available" : "Unavailable"}
                        </p>
                      </div>
                      <button
                        onClick={() => openModal(meal)}
                        disabled={!available}
                        className="mt-3 w-full bg-blue-600 text-white text-sm py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Order
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-white rounded-xl p-8 shadow-sm border text-center">
                <p className="text-gray-500 text-sm">
                  No meals in <span className="font-medium">{capitalize(selectedCategory)}</span>{" "}
                  category.
                </p>
              </div>
            )}

            {/* My Orders */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">My Orders</h3>
              {orders && orders.length > 0 ? (
                <div className="space-y-2">
                  {orders.map((order) => (
                    <div
                      key={order.id}
                      className="bg-white rounded-xl p-4 shadow-sm border"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 text-sm truncate">
                            {order.meal_name}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            #{order.order_no} &middot; {order.quantity}x &middot;{" "}
                            {formatIDR(order.total_cents)}
                          </p>
                          {order.notes && (
                            <p className="text-xs text-gray-400 mt-1 italic truncate">
                              &ldquo;{order.notes}&rdquo;
                            </p>
                          )}
                        </div>
                        <span
                          className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-full capitalize ${
                            STATUS_STYLES[order.status] || "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {order.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-xl p-8 shadow-sm border text-center">
                  <p className="text-gray-500 text-sm">No orders yet.</p>
                  <p className="text-gray-400 text-xs mt-1">
                    Select a meal above to place your first order.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Order Modal */}
          {modalMeal && (
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40">
              <div
                className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-lg p-6 shadow-xl"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="text-lg font-semibold text-gray-900">{modalMeal.name}</h3>
                <p className="text-blue-600 font-bold mt-1">
                  {formatIDR(modalMeal.price_cents)}
                </p>

                {/* Quantity */}
                <div className="mt-5">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quantity
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      disabled={quantity <= 1}
                      className="w-10 h-10 rounded-lg border border-gray-300 flex items-center justify-center text-lg font-medium hover:bg-gray-50 disabled:opacity-30 transition-colors"
                      aria-label="Decrease quantity"
                    >
                      &minus;
                    </button>
                    <span className="text-lg font-semibold w-8 text-center tabular-nums">
                      {quantity}
                    </span>
                    <button
                      onClick={() => setQuantity(Math.min(10, quantity + 1))}
                      disabled={quantity >= 10}
                      className="w-10 h-10 rounded-lg border border-gray-300 flex items-center justify-center text-lg font-medium hover:bg-gray-50 disabled:opacity-30 transition-colors"
                      aria-label="Increase quantity"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Notes */}
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. less spicy, extra sauce..."
                    maxLength={500}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm resize-none transition-shadow"
                  />
                </div>

                {/* Actions */}
                <div className="mt-5 flex gap-3">
                  <button
                    onClick={() => setModalMeal(null)}
                    className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleOrder}
                    disabled={placeOrder.isPending}
                    className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {placeOrder.isPending ? "Placing..." : "Place Order"}
                  </button>
                </div>

                {placeOrder.isError && (
                  <p className="text-red-500 text-xs mt-3 text-center">
                    {(placeOrder.error as Error)?.message || "Failed to place order"}
                  </p>
                )}
              </div>
            </div>
          )}
        </Layout>
      </RoleGuard>
    </ProtectedRoute>
  );
}
