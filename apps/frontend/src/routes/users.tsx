import { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { useUsers, useCreateUser, useUpdateUser, useRoles } from "../hooks/useUsers";
import { ProtectedRoute } from "../components/ProtectedRoute";
import { Layout } from "../components/Layout";
import { UserList } from "../components/UserList";
import { UserForm } from "../components/UserForm";

export function UsersPage() {
  const { user } = useAuth();
  const [roleFilter, setRoleFilter] = useState<string>("");
  const [showAddForm, setShowAddForm] = useState(false);
  
  const { data: users, isLoading } = useUsers(roleFilter || undefined);
  const { data: roles } = useRoles();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();

  if (user?.role_name !== "office_boy") {
    return (
      <ProtectedRoute>
        <Layout title="Access Denied">
          <p className="text-gray-500">Only office boy can manage users.</p>
        </Layout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <Layout title="User Management">
        {/* Role filter tabs */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          <button
            onClick={() => setRoleFilter("")}
            className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap ${!roleFilter ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700"}`}
          >
            All
          </button>
          {roles?.map((role) => (
            <button
              key={role.id}
              onClick={() => setRoleFilter(role.id)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap ${roleFilter === role.id ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700"}`}
            >
              {role.name.replace("_", " ")}
            </button>
          ))}
        </div>

        {/* Add user button */}
        <button
          onClick={() => setShowAddForm(true)}
          className="w-full mb-4 bg-green-600 text-white py-2 rounded-lg font-medium hover:bg-green-700"
        >
          + Add User
        </button>

        {/* Add user modal */}
        {showAddForm && (
          <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
            <div className="bg-white rounded-t-xl sm:rounded-xl w-full sm:max-w-md p-6 max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-semibold mb-4">Add User</h3>
              <UserForm
                roles={roles?.filter(r => r.name !== "office_boy" && r.name !== "manager") || []}
                onSubmit={(data) => {
                  createUser.mutate(data, {
                    onSuccess: () => setShowAddForm(false),
                  });
                }}
                isPending={createUser.isPending}
                error={createUser.error ? (createUser.error as Error).message : null}
              />
              <button
                onClick={() => setShowAddForm(false)}
                className="w-full mt-3 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* User list */}
        {isLoading ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
          </div>
        ) : (
          <UserList
            users={users || []}
            onToggleActive={(id, isActive) => updateUser.mutate({ id, is_active: !isActive })}
          />
        )}
      </Layout>
    </ProtectedRoute>
  );
}
