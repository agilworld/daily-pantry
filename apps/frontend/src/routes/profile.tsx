import { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { useSellerProfile, useUpdateProfile } from "../hooks/useSeller";
import { ProtectedRoute } from "../components/ProtectedRoute";
import { Layout } from "../components/Layout";
import { SellerProfileForm } from "../components/SellerProfileForm";

export function ProfilePage() {
  const { user } = useAuth();
  const { data: profile, isLoading } = useSellerProfile();
  const updateProfile = useUpdateProfile();
  const [isEditing, setIsEditing] = useState(false);

  if (user?.role_name !== "seller") {
    return (
      <ProtectedRoute>
        <Layout title="Access Denied">
          <p className="text-gray-500">Only sellers can manage their profile.</p>
        </Layout>
      </ProtectedRoute>
    );
  }

  if (isLoading) {
    return (
      <ProtectedRoute>
        <Layout title="Seller Profile">
          <div className="flex justify-center py-10">
            <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  if (isEditing) {
    return (
      <ProtectedRoute>
        <Layout title="Edit Profile">
          <SellerProfileForm
            initialData={{
              name: profile?.name || "",
              description: profile?.description || "",
              qris_image: profile?.qris_image || "",
            }}
            onSubmit={(data) => {
              updateProfile.mutate(data, {
                onSuccess: () => setIsEditing(false),
              });
            }}
            isPending={updateProfile.isPending}
            error={updateProfile.error ? (updateProfile.error as Error).message : null}
          />
          <button
            onClick={() => setIsEditing(false)}
            className="w-full mt-3 py-2 text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
        </Layout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <Layout title="Seller Profile">
        <div className="bg-white rounded-xl p-6 shadow-sm border space-y-4">
          {/* QRIS preview */}
          {profile?.qris_image ? (
            <div className="flex justify-center">
              <img
                src={profile.qris_image}
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

          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wide">Store Name</label>
            <p className="text-lg font-medium text-gray-900">{profile?.name || "Not set"}</p>
          </div>

          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wide">Description</label>
            <p className="text-gray-700">{profile?.description || "No description"}</p>
          </div>

          <button
            onClick={() => setIsEditing(true)}
            className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700"
          >
            Edit Profile
          </button>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
