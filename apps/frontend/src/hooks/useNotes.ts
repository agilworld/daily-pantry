import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";

export interface Note {
  id: string;
  author_id: string;
  content: string;
  is_broadcast: boolean;
  created_at: string;
  author_name: string;
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

export function useCreateNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { content: string; is_broadcast: boolean }) =>
      api.post<{ note: Note }>("/notes", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notes"] }),
  });
}
