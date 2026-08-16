import { useState } from "react";
import { ProtectedRoute } from "../components/ProtectedRoute";
import { RoleGuard } from "../components/RoleGuard";
import { Layout } from "../components/Layout";
import { useActiveMeals } from "../hooks/useMeals";
import { useCategories } from "../hooks/useCategories";
import { usePlaceOrder } from "../hooks/useOrders";

function formatIDR(cents: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(cents);
}

export function OrderPage() {
  // "all" = no filter; otherwise the food store category id.
  const [filterCategoryId, setFilterCategoryId] = useState<string>("all");
  const { data: meals, isLoading: mealsLoading } = useActiveMeals();
  const { data: categories = [] } = useCategories();

  const filteredMeals =
    filterCategoryId === "all"
      ? meals
      : meals?.filter((meal) => meal.category_id === filterCategoryId);

  const [modalMeal, setModalMeal] = useState<{
    id: string;
    name: string;
    price_cents: number;
  } | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");

  const placeOrder = usePlaceOrder();

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
      <RoleGuard allowedRoles={["employee", "seller", "office_boy", "manager"]}>
        <Layout title="Order Meals">
          <div className="space-y-6">
            {/* Food store filter */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              <button
                onClick={() => setFilterCategoryId("all")}
                className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  filterCategoryId === "all"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                All
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setFilterCategoryId(cat.id)}
                  className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                    filterCategoryId === cat.id
                      ? "bg-blue-600 text-white shadow-sm"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            {/* Meal Cards */}
            {mealsLoading ? (
              <div className="flex justify-center py-10">
                <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
              </div>
            ) : filteredMeals && filteredMeals.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {filteredMeals.map((meal) => {
                  const available = meal.is_active;
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
                        {meal.category_name && (
                          <span className="inline-block mt-1.5 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                            {meal.category_name}
                          </span>
                        )}
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
                <p className="text-gray-500 text-sm">No meals available.</p>
              </div>
            )}
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
