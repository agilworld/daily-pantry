import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";

export interface Note {
  id: string;
  author_id: string;
  content: string;
  is_broadcast: boolean;
  image: string | null;
  link_url: string | null;
  created_at: string;
  author_name: string;
  author_avatar: string | null;
}

export function useNotes(date?: string) {
  return useQuery({
    queryKey: ["notes", { date: date ?? null }],
    queryFn: () =>
      api
        .get<{ notes: Note[] }>(`/notes${date ? `?date=${date}` : ""}`)
        .then(r => r.notes),
    staleTime: 30 * 1000,
  });
}

export interface CreateNoteData {
  content: string;
  is_broadcast: boolean;
  image?: string;
  link_url?: string;
}

export function useCreateNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateNoteData) =>
      api.post<{ note: Note }>("/notes", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notes"] }),
  });
}
