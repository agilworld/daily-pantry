import { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { useNotes, useCreateNote } from "../hooks/useNotes";
import { ProtectedRoute } from "../components/ProtectedRoute";
import { Layout } from "../components/Layout";

export function NotesPage() {
  const { user } = useAuth();
  const [date, setDate] = useState<string>("");
  const [content, setContent] = useState("");
  const { data: notes, isLoading } = useNotes(date || undefined);
  const createNote = useCreateNote();

  const canCreate = user?.role_name === "seller" || user?.role_name === "office_boy";

  return (
    <ProtectedRoute>
      <Layout title="Notes">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg text-sm mb-4 focus:ring-2 focus:ring-blue-500"
        />

        {canCreate && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createNote.mutate({ content, is_broadcast: true }, { onSuccess: () => setContent("") });
            }}
            className="mb-6"
          >
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write a note..."
              rows={3}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 resize-none"
            />
            <button
              type="submit"
              disabled={!content.trim() || createNote.isPending}
              className="mt-2 w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {createNote.isPending ? "Posting..." : "Post Note"}
            </button>
          </form>
        )}

        {isLoading ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
          </div>
        ) : (
          <div className="space-y-3">
            {notes?.map((n) => (
              <div key={n.id} className="bg-white rounded-xl p-4 shadow-sm border">
                <p className="text-gray-800">{n.content}</p>
                <p className="text-xs text-gray-400 mt-2">
                  {n.author_name} · {new Date(n.created_at).toLocaleString()}
                </p>
              </div>
            ))}
            {(!notes || notes.length === 0) && (
              <p className="text-gray-500 text-center py-8">No notes yet.</p>
            )}
          </div>
        )}
      </Layout>
    </ProtectedRoute>
  );
}
