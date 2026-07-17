export interface UserListItem {
  id: string;
  name: string;
  email: string;
  phone_no: string | null;
  is_active: boolean;
  blocked: boolean;
  role_id: string;
  role_name: string;
  created_at: string;
}
