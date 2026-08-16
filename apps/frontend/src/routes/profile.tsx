import { useState } from "react";
import { useAuth, useUpdateProfile, useChangePassword } from "../hooks/useAuth";
import { useSellerProfile, useUpdateProfile as useUpdateSellerProfile } from "../hooks/useSeller";
import { ProtectedRoute } from "../components/ProtectedRoute";
import { Layout } from "../components/Layout";
import { SellerProfileForm } from "../components/SellerProfileForm";

// --- Shared field styles ---

const inputClass =
  "w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500";

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <label className="text-xs text-gray-500 uppercase tracking-wide">{label}</label>
      <p className="text-gray-900">{value || "Not set"}</p>
    </div>
  );
}

// --- Edit profile form (all roles) ---

function EditProfileForm({
  initial,
  onCancel,
}: {
  initial: { name: string; phone_no: string; description: string };
  onCancel: () => void;
}) {
  const updateProfile = useUpdateProfile();
  const [name, setName] = useState(initial.name);
  const [phone, setPhone] = useState(initial.phone_no);
  const [description, setDescription] = useState(initial.description);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (name.trim().length < 2) {
      setError("Name must be at least 2 characters");
      return;
    }
    updateProfile.mutate(
      {
        name: name.trim(),
        phone_no: phone.trim() || undefined,
        description: description.trim() || undefined,
      },
      {
        onSuccess: () => onCancel(),
        onError: (err) => setError(err instanceof Error ? err.message : "Failed to update profile"),
      },
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="bg-red-50 text-red-700 px-3 py-2 rounded-lg text-sm">{error}</div>}

      <div>
        <label htmlFor="profile-name" className="block text-sm font-medium text-gray-700 mb-1">Name</label>
        <input id="profile-name" type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
      </div>

      <div>
        <label htmlFor="profile-phone" className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
        <input
          id="profile-phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className={inputClass}
          placeholder="e.g. 0812-3456-7890"
        />
      </div>

      <div>
        <label htmlFor="profile-description" className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea
          id="profile-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          maxLength={500}
          className={`${inputClass} resize-none`}
          placeholder="Tell others about yourself (max 500 characters)"
        />
        <p className="text-xs text-gray-400 mt-1">{description.length}/500</p>
      </div>

      <button
        type="submit"
        disabled={updateProfile.isPending}
        className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
      >
        {updateProfile.isPending ? "Saving..." : "Save"}
      </button>
      <button
        type="button"
        onClick={onCancel}
        disabled={updateProfile.isPending}
        className="w-full py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50"
      >
        Cancel
      </button>
    </form>
  );
}

// --- Change password form (all roles) ---

function ChangePasswordForm() {
  const changePassword = useChangePassword();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setCurrent("");
    setNext("");
    setConfirm("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setError(null);

    if (next.length < 6) {
      setError("New password must be at least 6 characters");
      return;
    }
    if (next !== confirm) {
      setError("New passwords do not match");
      return;
    }

    changePassword.mutate(
      { current_password: current, new_password: next },
      {
        onSuccess: () => {
          setMessage("Password changed successfully.");
          reset();
        },
        onError: (err) =>
          setError(err instanceof Error ? err.message : "Failed to change password"),
      },
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {message && <div className="bg-green-50 text-green-700 px-3 py-2 rounded-lg text-sm">{message}</div>}
      {error && <div className="bg-red-50 text-red-700 px-3 py-2 rounded-lg text-sm">{error}</div>}

      <div>
        <label htmlFor="pw-current" className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
        <input
          id="pw-current"
          type="password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          className={inputClass}
          placeholder="••••••"
        />
      </div>

      <div>
        <label htmlFor="pw-new" className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
        <input
          id="pw-new"
          type="password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          className={inputClass}
          placeholder="At least 6 characters"
        />
      </div>

      <div>
        <label htmlFor="pw-confirm" className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
        <input
          id="pw-confirm"
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className={inputClass}
          placeholder="Repeat new password"
        />
      </div>

      <button
        type="submit"
        disabled={changePassword.isPending || !current || !next || !confirm}
        className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
      >
        {changePassword.isPending ? "Changing..." : "Change Password"}
      </button>
    </form>
  );
}

// --- Main profile page ---

export function ProfilePage() {
  const { user } = useAuth();
  const { data: sellerProfile } = useSellerProfile();
  const updateSellerProfile = useUpdateSellerProfile();
  const [isEditing, setIsEditing] = useState(false);
  const [isSellerEditing, setIsSellerEditing] = useState(false);

  const isSeller = user?.role_name === "seller";
  const hasSellerProfile = isSeller && !!sellerProfile;

  return (
    <ProtectedRoute>
      <Layout title="My Profile">
        <div className="space-y-6">
          {/* ======== PERSONAL PROFILE (all roles) ======== */}
          <section className="bg-white rounded-xl p-6 shadow-sm border space-y-4">
            {isEditing ? (
              <EditProfileForm
                initial={{
                  name: user?.name || "",
                  phone_no: user?.phone_no || "",
                  description: user?.description || "",
                }}
                onCancel={() => setIsEditing(false)}
              />
            ) : (
              <>
                <div className="space-y-4">
                  <InfoRow label="Name" value={user?.name} />
                  <InfoRow label="Email" value={user?.email} />
                  <InfoRow label="Role" value={user?.role_name?.replace("_", " ")} />
                  <InfoRow label="Phone" value={user?.phone_no} />
                  <InfoRow label="Description" value={user?.description} />
                </div>
                <button
                  onClick={() => setIsEditing(true)}
                  className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700"
                >
                  Edit Profile
                </button>
              </>
            )}
          </section>

          {/* ======== SELLER STOREFRONT (seller only) ======== */}
          {isSeller && hasSellerProfile && (
            <section className="bg-white rounded-xl p-6 shadow-sm border space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Store Profile</h3>

              {isSellerEditing ? (
                <>
                  <SellerProfileForm
                    initialData={{
                      name: sellerProfile.name || "",
                      description: sellerProfile.description || "",
                      qris_image: sellerProfile.qris_image || "",
                    }}
                    onSubmit={(data) => {
                      updateSellerProfile.mutate(data, {
                        onSuccess: () => setIsSellerEditing(false),
                      });
                    }}
                    isPending={updateSellerProfile.isPending}
                    error={updateSellerProfile.error ? (updateSellerProfile.error as Error).message : null}
                  />
                  <button
                    onClick={() => setIsSellerEditing(false)}
                    className="w-full mt-3 py-2 text-gray-600 hover:text-gray-800"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  {sellerProfile.qris_image ? (
                    <div className="flex justify-center">
                      <img
                        src={sellerProfile.qris_image}
                        alt="QRIS"
                        className="w-48 h-48 object-contain border rounded-lg"
                      />
                    </div>
                  ) : (
                    <div className="flex justify-center">
                      <div className="w-48 h-48 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 text-sm">
                        No QRIS uploaded
                      </div>
                    </div>
                  )}

                  <InfoRow label="Store Name" value={sellerProfile.name} />
                  <InfoRow label="Description" value={sellerProfile.description} />

                  <button
                    onClick={() => setIsSellerEditing(true)}
                    className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700"
                  >
                    Edit Store Profile
                  </button>
                </>
              )}
            </section>
          )}

          {/* ======== CHANGE PASSWORD (all roles) ======== */}
          <section className="bg-white rounded-xl p-6 shadow-sm border space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Change Password</h3>
            <ChangePasswordForm />
          </section>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
