export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role_id: string;
  role_name?: string;
  phone_no: string | null;
  avatar: string | null;
  description: string | null;
  is_active: boolean;
  blocked: boolean;
  created_at: string;
}

export interface SessionInfo {
  id: string;
  user_id: string;
  token: string;
  expires_at: string;
  created_at: string;
}
