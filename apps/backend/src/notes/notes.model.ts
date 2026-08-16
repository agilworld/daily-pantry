export interface Note {
  id: string;
  author_id: string;
  content: string;
  is_broadcast: boolean;
  created_at: string;
  author_name?: string;
}
