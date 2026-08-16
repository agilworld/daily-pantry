import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createMealSchema } from "@dailypantry/shared";
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
import {
  useCategories,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
  type Category,
} from "../hooks/useCategories";

/* ── helpers ── */

const formatPrice = (cents: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(cents);

const categoryBadgeClass = (name: string | null | undefined) => {
  // Deterministic color pick from a small palette so food store badges stay readable.
  const palette = [
    "bg-yellow-100 text-yellow-800",
    "bg-orange-100 text-orange-800",
    "bg-green-100 text-green-800",
    "bg-blue-100 text-blue-800",
    "bg-purple-100 text-purple-800",
    "bg-pink-100 text-pink-800",
  ];
  if (!name) return "bg-gray-100 text-gray-600";
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return palette[Math.abs(hash) % palette.length];
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
  categories: Category[];
  initial?: { name: string; price_cents: number; category_id: string | null; description: string | null };
  onSave: (data: {
    name: string;
    price_cents: number;
    category_id: string | null;
    description?: string;
    image_url?: string;
  }) => void;
  onCancel: () => void;
  isPending: boolean;
  error: string | null;
  submitLabel: string;
}

function MealForm({
  categories,
  initial,
  onSave,
  onCancel,
  isPending,
  error,
  submitLabel,
}: MealFormProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [price, setPrice] = useState(initial ? String(initial.price_cents) : "");
  const [categoryId, setCategoryId] = useState(initial?.category_id ?? "");
  const [desc, setDesc] = useState(initial?.description ?? "");
  const [imgUrl, setImgUrl] = useState("");
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    const data = {
      name,
      price_cents: parseInt(price, 10),
      // "" (None / own-selling) maps to null for the backend FK.
      category_id: categoryId || null,
      description: desc || undefined,
      image_url: imgUrl || undefined,
    };
    const result = createMealSchema.safeParse(data);
    if (!result.success) {
      setErrors(result.error.flatten().fieldErrors);
      return;
    }
    // Normalize optional schema fields to the required-but-nullable save contract.
    onSave({
      name: result.data.name,
      price_cents: result.data.price_cents,
      category_id: result.data.category_id ?? null,
      description: result.data.description,
      image_url: result.data.image_url,
    });
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

      {/* Food store category (from API) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Food Store <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="w-full border rounded-lg px-3 py-2 text-sm bg-white"
        >
          <option value="">None (own-selling)</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        {errors.category_id && (
          <p className="text-red-500 text-xs mt-1">{errors.category_id[0]}</p>
        )}
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

/* ── category form (add / edit food store, office boy only) ── */

interface CategoryFormProps {
  initial?: { id: string; name: string; description: string | null };
  onSave: (data: { name: string; description?: string | null }) => void;
  onCancel: () => void;
  isPending: boolean;
  error: string | null;
  submitLabel: string;
}

function CategoryForm({
  initial,
  onSave,
  onCancel,
  isPending,
  error,
  submitLabel,
}: CategoryFormProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [desc, setDesc] = useState(initial?.description ?? "");
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    if (name.trim().length < 2) {
      setErrors({ name: ["Name must be at least 2 characters"] });
      return;
    }
    onSave({ name: name.trim(), description: desc.trim() || null });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full border rounded-lg px-3 py-2 text-sm"
          placeholder="e.g. Warung Bu Siti"
        />
        {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name[0]}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Description <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <textarea
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          className="w-full border rounded-lg px-3 py-2 text-sm"
          rows={2}
          placeholder="Optional description"
        />
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
  const isOfficeBoy = user?.role_name === "office_boy";

  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editMeal, setEditMeal] = useState<Meal | null>(null);
  const [deleteMeal, setDeleteMeal] = useState<Meal | null>(null);

  const [showAddCategory, setShowAddCategory] = useState(false);
  const [editCategory, setEditCategory] = useState<Category | null>(null);
  const [deleteCategory, setDeleteCategory] = useState<Category | null>(null);

  const { data: categories = [] } = useCategories();
  const { data: meals, isLoading } = useMeals(selectedCategoryId || undefined);
  const createMeal = useCreateMeal();
  const updateMeal = useUpdateMeal();
  const toggleMeal = useToggleAvailable();
  const deleteMealMutation = useDeleteMeal();

  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategoryMutation = useDeleteCategory();

  const handleToggle = (meal: Meal) => {
    queryClient.setQueryData<Meal[]>(
      ["meals", { categoryId: selectedCategoryId || undefined }],
      (old) => old?.map((m) => (m.id === meal.id ? { ...m, is_active: !m.is_active } : m)),
    );
    toggleMeal.mutate(meal.id);
  };

  return (
    <ProtectedRoute>
      <RoleGuard allowedRoles={["seller", "office_boy"]}>
        <Layout title="Manage Menu">
          {/* Category filter (food stores) */}
          <div className="mb-4">
            <select
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm bg-white"
            >
              <option value="">All Food Stores</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
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
                      {meal.category_name && (
                        <span
                          className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full uppercase shrink-0 ${
                            categoryBadgeClass(meal.category_name) ?? "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {meal.category_name}
                        </span>
                      )}
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

          {/* Manage Categories — office boy only (food store names + descriptions) */}
          {isOfficeBoy && (
            <div className="mt-8">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold">Manage Food Stores</h3>
                <button
                  onClick={() => setShowAddCategory(true)}
                  className="bg-blue-600 text-white text-sm px-3 py-1.5 rounded-lg font-medium hover:bg-blue-700"
                >
                  + Add
                </button>
              </div>
              {categories.length === 0 ? (
                <div className="bg-white rounded-xl p-6 shadow-sm border text-center text-gray-400 text-sm">
                  No food stores yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {categories.map((cat) => (
                    <div
                      key={cat.id}
                      className="bg-white rounded-xl p-4 shadow-sm border flex items-center gap-3"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 text-sm truncate">{cat.name}</p>
                        {cat.description && (
                          <p className="text-xs text-gray-400 mt-0.5 truncate">{cat.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => setEditCategory(cat)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteCategory(cat)}
                          className="text-red-500 hover:text-red-700 text-sm font-medium"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Add meal modal */}
          {showAdd && (
            <Modal onClose={() => setShowAdd(false)}>
              <h3 className="text-lg font-semibold mb-4">Add Meal</h3>
              <MealForm
                categories={categories}
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

          {/* Edit meal modal */}
          {editMeal && (
            <Modal onClose={() => setEditMeal(null)}>
              <h3 className="text-lg font-semibold mb-4">Edit Meal</h3>
              <MealForm
                categories={categories}
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

          {/* Delete meal confirmation modal */}
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

          {/* Add category modal */}
          {showAddCategory && (
            <Modal onClose={() => setShowAddCategory(false)}>
              <h3 className="text-lg font-semibold mb-4">Add Food Store</h3>
              <CategoryForm
                onSave={(data) =>
                  createCategory.mutate(data, { onSuccess: () => setShowAddCategory(false) })
                }
                onCancel={() => setShowAddCategory(false)}
                isPending={createCategory.isPending}
                error={(createCategory.error as Error | null)?.message ?? null}
                submitLabel="Add Food Store"
              />
            </Modal>
          )}

          {/* Edit category modal */}
          {editCategory && (
            <Modal onClose={() => setEditCategory(null)}>
              <h3 className="text-lg font-semibold mb-4">Edit Food Store</h3>
              <CategoryForm
                initial={editCategory}
                onSave={(data) =>
                  updateCategory.mutate(
                    { id: editCategory.id, ...data },
                    { onSuccess: () => setEditCategory(null) },
                  )
                }
                onCancel={() => setEditCategory(null)}
                isPending={updateCategory.isPending}
                error={(updateCategory.error as Error | null)?.message ?? null}
                submitLabel="Update Food Store"
              />
            </Modal>
          )}

          {/* Delete category confirmation modal */}
          {deleteCategory && (
            <Modal onClose={() => setDeleteCategory(null)}>
              <h3 className="text-lg font-semibold mb-4">Delete Food Store</h3>
              <p className="text-gray-600 text-sm mb-6">
                Are you sure you want to deactivate <strong>{deleteCategory.name}</strong>? Meals
                linked to it will keep selling as own-selling meals.
              </p>
              <button
                type="button"
                onClick={() =>
                  deleteCategoryMutation.mutate(deleteCategory.id, {
                    onSuccess: () => setDeleteCategory(null),
                  })
                }
                disabled={deleteCategoryMutation.isPending}
                className="w-full bg-red-600 text-white py-2 rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 text-sm"
              >
                {deleteCategoryMutation.isPending ? "Deleting..." : "Delete Food Store"}
              </button>
            </Modal>
          )}
        </Layout>
      </RoleGuard>
    </ProtectedRoute>
  );
}
