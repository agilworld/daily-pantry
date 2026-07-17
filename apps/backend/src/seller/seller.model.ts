export interface SellerProfile {
  id: string;
  name: string;
  email: string;
  description: string | null;
  qris_image: string | null; // base64
  created_at: string;
  updated_at: string | null;
}
