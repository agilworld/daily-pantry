import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { MEAL_CATEGORIES, createMealSchema } from "@dailypantry/shared";
import { ProtectedRoute } from "../components/ProtectedRoute";
import { RoleGuard } from "../components/RoleGuard";
import { Layout } from "../components/Layout";
import { useAuth } from "../hooks/useAuth";
import {
  useMeals,
  useCreateMeal,
  useUpdateMeal,
  useToggleAvailable,
  useDeleteMeal,
  type Meal,
} from "../hooks/useMeals";

/* ── helpers ── */

const formatPrice = (cents: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(cents);

const catLabel: Record<string, string> = {
  nasi: "Nasi",
  mie: "Mie",
  snack: "Snack",
  minuman: "Minuman",
};

const catBadge: Record<string, string> = {
  nasi: "bg-yellow-100 text-yellow-800",
  mie: "bg-orange-100 text-orange-800",
  snack: "bg-green-100 text-green-800",
  minuman: "bg-blue-100 text-blue-800",
};

/* ── shared modal overlay ── */

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white rounded-t-xl sm:rounded-xl w-full sm:max-w-md p-6 max-h-[90vh] overflow-y-auto">
        {children}
        <button
          onClick={onClose}
          className="w-full mt-3 py-2 text-gray-600 hover:text-gray-800 text-sm"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

/* ── reusable meal form (add / edit) ── */

interface MealFormProps {
  initial?: { name: string; price_cents: number; category: string; description: string | null };
  onSave: (data: {
    name: string;
    price_cents: number;
    category: string;
    description?: string;
    image_url?: string;
  }) => void;
  onCancel: () => void;
  isPending: boolean;
  error: string | null;
  submitLabel: string;
}

function MealForm({ initial, onSave, onCancel, isPending, error, submitLabel }: MealFormProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [price, setPrice] = useState(initial ? String(initial.price_cents) : "");
  const [category, setCategory] = useState(initial?.category ?? "");
  const [desc, setDesc] = useState(initial?.description ?? "");
  const [imgUrl, setImgUrl] = useState("");
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    const data = {
      name,
      price_cents: parseInt(price, 10),
      category,
      description: desc || undefined,
      image_url: imgUrl || undefined,
    };
    const result = createMealSchema.safeParse(data);
    if (!result.success) {
      setErrors(result.error.flatten().fieldErrors);
      return;
    }
    onSave(result.data);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full border rounded-lg px-3 py-2 text-sm"
          placeholder="Nasi Goreng"
        />
        {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name[0]}</p>}
      </div>

      {/* Price */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Price (Rp)</label>
        <input
          type="number"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="w-full border rounded-lg px-3 py-2 text-sm"
          placeholder="15000"
          min={0}
        />
        {errors.price_cents && <p className="text-red-500 text-xs mt-1">{errors.price_cents[0]}</p>}
      </div>

      {/* Category */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full border rounded-lg px-3 py-2 text-sm bg-white"
        >
          <option value="">Select category</option>
          {MEAL_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {catLabel[c] ?? c}
            </option>
          ))}
        </select>
        {errors.category && <p className="text-red-500 text-xs mt-1">{errors.category[0]}</p>}
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          className="w-full border rounded-lg px-3 py-2 text-sm"
          rows={3}
          placeholder="Optional description"
        />
        {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description[0]}</p>}
      </div>

      {/* Image URL */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
        <input
          type="text"
          value={imgUrl}
          onChange={(e) => setImgUrl(e.target.value)}
          className="w-full border rounded-lg px-3 py-2 text-sm"
          placeholder="https://example.com/image.jpg"
        />
        {errors.image_url && <p className="text-red-500 text-xs mt-1">{errors.image_url[0]}</p>}
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 text-sm"
      >
        {isPending ? "Saving..." : submitLabel}
      </button>
    </form>
  );
}

/* ── page ── */

export function MenuPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [selectedCategory, setSelectedCategory] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editMeal, setEditMeal] = useState<Meal | null>(null);
  const [deleteMeal, setDeleteMeal] = useState<Meal | null>(null);

  const { data: meals, isLoading } = useMeals(selectedCategory || undefined);
  const createMeal = useCreateMeal();
  const updateMeal = useUpdateMeal();
  const toggleMeal = useToggleAvailable();
  const deleteMealMutation = useDeleteMeal();

  const handleToggle = (meal: Meal) => {
    queryClient.setQueryData<Meal[]>(
      ["meals", { category: selectedCategory || undefined }],
      (old) => old?.map((m) => (m.id === meal.id ? { ...m, is_active: !m.is_active } : m)),
    );
    toggleMeal.mutate(meal.id);
  };

  return (
    <ProtectedRoute>
      <RoleGuard allowedRoles={["seller"]}>
        <Layout title="Manage Menu">
          {/* Category filter */}
          <div className="mb-4">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm bg-white"
            >
              <option value="">All Categories</option>
              {MEAL_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {catLabel[cat] ?? cat}
                </option>
              ))}
            </select>
          </div>

          {/* Add Meal button */}
          <button
            onClick={() => setShowAdd(true)}
            className="w-full mb-4 bg-green-600 text-white py-2.5 rounded-lg font-medium hover:bg-green-700 text-sm"
          >
            + Add Meal
          </button>

          {/* Meal list */}
          {isLoading ? (
            <div className="flex justify-center py-10">
              <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
            </div>
          ) : meals?.length === 0 ? (
            <div className="bg-white rounded-xl p-6 shadow-sm border text-center text-gray-400 text-sm">
              No meals yet. Add your first meal!
            </div>
          ) : (
            <div className="space-y-3">
              {meals?.map((meal) => (
                <div
                  key={meal.id}
                  className="bg-white rounded-xl p-4 shadow-sm border flex items-center gap-3"
                >
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 text-sm truncate">
                        {meal.name}
                      </span>
                      <span
                        className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full uppercase shrink-0 ${
                          catBadge[meal.category] ?? "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {catLabel[meal.category] ?? meal.category}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-0.5">{formatPrice(meal.price_cents)}</p>
                    {meal.description && (
                      <p className="text-xs text-gray-400 mt-0.5 truncate">{meal.description}</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Availability toggle */}
                    <button
                      type="button"
                      onClick={() => handleToggle(meal)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                        meal.is_active ? "bg-green-500" : "bg-gray-300"
                      }`}
                      aria-label={meal.is_active ? "Deactivate meal" : "Activate meal"}
                    >
                      <span
                        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                          meal.is_active ? "translate-x-[18px]" : "translate-x-[2px]"
                        }`}
                      />
                    </button>

                    {/* Edit */}
                    <button
                      type="button"
                      onClick={() => setEditMeal(meal)}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      Edit
                    </button>

                    {/* Delete */}
                    <button
                      type="button"
                      onClick={() => setDeleteMeal(meal)}
                      className="text-red-500 hover:text-red-700 text-sm font-medium"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add modal */}
          {showAdd && (
            <Modal onClose={() => setShowAdd(false)}>
              <h3 className="text-lg font-semibold mb-4">Add Meal</h3>
              <MealForm
                onSave={(data) =>
                  createMeal.mutate(data, { onSuccess: () => setShowAdd(false) })
                }
                onCancel={() => setShowAdd(false)}
                isPending={createMeal.isPending}
                error={(createMeal.error as Error | null)?.message ?? null}
                submitLabel="Add Meal"
              />
            </Modal>
          )}

          {/* Edit modal */}
          {editMeal && (
            <Modal onClose={() => setEditMeal(null)}>
              <h3 className="text-lg font-semibold mb-4">Edit Meal</h3>
              <MealForm
                initial={editMeal}
                onSave={(data) =>
                  updateMeal.mutate(
                    { id: editMeal.id, ...data },
                    { onSuccess: () => setEditMeal(null) },
                  )
                }
                onCancel={() => setEditMeal(null)}
                isPending={updateMeal.isPending}
                error={(updateMeal.error as Error | null)?.message ?? null}
                submitLabel="Update Meal"
              />
            </Modal>
          )}

          {/* Delete confirmation modal */}
          {deleteMeal && (
            <Modal onClose={() => setDeleteMeal(null)}>
              <h3 className="text-lg font-semibold mb-4">Delete Meal</h3>
              <p className="text-gray-600 text-sm mb-6">
                Are you sure you want to deactivate <strong>{deleteMeal.name}</strong>?
              </p>
              <button
                type="button"
                onClick={() =>
                  deleteMealMutation.mutate(deleteMeal.id, {
                    onSuccess: () => setDeleteMeal(null),
                  })
                }
                disabled={deleteMealMutation.isPending}
                className="w-full bg-red-600 text-white py-2 rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 text-sm"
              >
                {deleteMealMutation.isPending ? "Deleting..." : "Delete Meal"}
              </button>
            </Modal>
          )}
        </Layout>
      </RoleGuard>
    </ProtectedRoute>
  );
}
