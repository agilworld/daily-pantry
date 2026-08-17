import { roleLabel } from "../lib/roles";

interface UserItem {
  id: string;
  name: string;
  email: string;
  role_name: string;
  is_active: boolean;
  phone_no: string | null;
}

interface Props {
  users: UserItem[];
  onToggleActive: (id: string, isActive: boolean) => void;
}

export function UserList({ users, onToggleActive }: Props) {
  if (!users.length) {
    return <p className="text-gray-500 text-center py-8">No users found.</p>;
  }

  return (
    <div className="space-y-3">
      {users.map((user) => (
        <div key={user.id} className={`bg-white rounded-xl p-4 shadow-sm border ${!user.is_active ? "opacity-60" : ""}`}>
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-medium text-gray-900 truncate">{user.name}</h3>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  user.role_name === "office_boy" ? "bg-purple-100 text-purple-700" :
                  user.role_name === "seller" ? "bg-green-100 text-green-700" :
                  user.role_name === "manager" ? "bg-orange-100 text-orange-700" :
                  "bg-blue-100 text-blue-700"
                }`}>
                  {roleLabel(user.role_name)}
                </span>
              </div>
              <p className="text-sm text-gray-500 truncate mt-0.5">{user.email}</p>
              {user.phone_no && <p className="text-xs text-gray-400 mt-0.5">{user.phone_no}</p>}
            </div>
            <button
              onClick={() => onToggleActive(user.id, user.is_active)}
              className={`ml-3 px-3 py-1.5 rounded-lg text-xs font-medium ${
                user.is_active
                  ? "bg-red-50 text-red-600 hover:bg-red-100"
                  : "bg-green-50 text-green-600 hover:bg-green-100"
              }`}
            >
              {user.is_active ? "Deactivate" : "Activate"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
