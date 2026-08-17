export interface Note {
  id: string;
  author_id: string;
  content: string;
  is_broadcast: boolean;
  image: string | null;
  link_url: string | null;
  created_at: string;
  author_name?: string;
  author_avatar: string | null;
}
