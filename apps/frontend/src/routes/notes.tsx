import { useRef, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { useNotes, useCreateNote } from "../hooks/useNotes";
import { ProtectedRoute } from "../components/ProtectedRoute";
import { Layout } from "../components/Layout";
import { resizeImageToDataUrl } from "../lib/imageResize";

// Max input file size BEFORE frontend resize (10MB). The resize step outputs
// a ~1280px JPEG/WebP data URL, which keeps the stored payload far smaller.
const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

const EMOJIS = [
  "😀","😁","😂","🤣","😊","😍","😘","😎","🤩","🥳","😅","😭","😡","👍","👎","🙏","👏","💪","🤝","❤️","🎉","✨","🔥","🍽️","🍛","🍜","🍚","☕","🍵","💰","✅","❌","⚠️","📢",
];

// Lightweight URL check: require a scheme so "example.com" isn't auto-linked
// as a relative path and so the backend's URL validation matches what we send.
function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString();
}

export function NotesPage() {
  const { user } = useAuth();
  const [date, setDate] = useState<string>("");
  const [content, setContent] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [linkUrl, setLinkUrl] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [urlError, setUrlError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: notes, isLoading } = useNotes(date || undefined);
  const createNote = useCreateNote();

  const canCreate = user?.role_name === "seller" || user?.role_name === "office_boy";

  const hasContent = content.trim().length > 0 || image !== null || linkUrl.trim().length > 0;
  const canSubmit = hasContent && !createNote.isPending;

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageError(null);

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setImageError("Please select a JPEG, PNG, WebP, or GIF image");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setImageError("Image must be under 10MB");
      return;
    }

    try {
      // Resize client-side (max ~1280px, quality 0.85) so uploads stay small
      // while keeping quality. Output is jpeg/webp, so gif source becomes a
      // single static frame.
      const dataUrl = await resizeImageToDataUrl(file);
      setImage(dataUrl);
      setImageError(null);
    } catch {
      setImageError("Failed to read image");
    }
    // Allow re-selecting the same file after removing the preview.
    e.target.value = "";
  };

  const removeImage = () => {
    setImage(null);
    setImageError(null);
  };

  // Insert at the textarea cursor when available; fall back to appending.
  const insertEmoji = (emoji: string) => {
    const el = textareaRef.current;
    const start = el?.selectionStart ?? content.length;
    const end = el?.selectionEnd ?? content.length;
    const next = content.slice(0, start) + emoji + content.slice(end);
    setContent(next);
    setShowEmoji(false);
    // Restore focus + cursor after the update lands.
    requestAnimationFrame(() => {
      if (el) {
        el.focus();
        el.setSelectionRange(start + emoji.length, start + emoji.length);
      }
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const url = linkUrl.trim();
    if (url && !isValidUrl(url)) {
      setUrlError("Enter a valid link starting with http:// or https://");
      return;
    }
    setUrlError(null);

    if (!canSubmit) return;

    createNote.mutate(
      {
        content: content.trim(),
        is_broadcast: true,
        image: image ?? undefined,
        link_url: url || undefined,
      },
      {
        onSuccess: () => {
          setContent("");
          setImage(null);
          setLinkUrl("");
          setImageError(null);
          setUrlError(null);
          setShowEmoji(false);
        },
      },
    );
  };

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
          <form onSubmit={handleSubmit} className="mb-6 bg-white rounded-xl p-4 shadow-sm border">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write a note..."
              rows={3}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 resize-none"
            />

            {/* Image preview */}
            {image && (
              <div className="relative mt-2 inline-block">
                <img
                  src={image}
                  alt="Note preview"
                  className="max-h-48 rounded-lg border object-contain"
                />
                <button
                  type="button"
                  onClick={removeImage}
                  aria-label="Remove image"
                  className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-gray-800 text-white text-sm leading-none hover:bg-gray-600"
                >
                  ×
                </button>
              </div>
            )}
            {imageError && <p className="text-red-500 text-xs mt-1">{imageError}</p>}

            {/* Link URL */}
            <div className="mt-2">
              <input
                type="text"
                inputMode="url"
                value={linkUrl}
                onChange={(e) => {
                  setLinkUrl(e.target.value);
                  if (urlError) setUrlError(null);
                }}
                placeholder="https://example.com (optional link)"
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              />
              {urlError && <p className="text-red-500 text-xs mt-1">{urlError}</p>}
            </div>

            {/* Control row: emoji + image */}
            <div className="flex gap-2 mt-2">
              <button
                type="button"
                onClick={() => setShowEmoji((v) => !v)}
                aria-expanded={showEmoji}
                aria-label={showEmoji ? "Close emoji picker" : "Open emoji picker"}
                className="px-3 py-2 border rounded-lg text-sm hover:bg-gray-50"
              >
                😊 Emoji
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-2 border rounded-lg text-sm hover:bg-gray-50"
              >
                📷 Image
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleImageChange}
                aria-label="Attach image"
                className="hidden"
              />
            </div>

            {/* Emoji palette */}
            {showEmoji && (
              <div className="mt-2 p-2 border rounded-lg bg-gray-50 grid grid-cols-8 gap-1 max-h-40 overflow-y-auto">
                {EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => insertEmoji(emoji)}
                    className="text-xl hover:bg-gray-200 rounded p-1"
                    aria-label={`Add ${emoji}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}

            <button
              type="submit"
              disabled={!canSubmit}
              className="mt-3 w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
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
                {n.content && <p className="text-gray-800 whitespace-pre-wrap break-words">{n.content}</p>}
                {n.image && (
                  <img
                    src={n.image}
                    alt="Note attachment"
                    className="mt-2 max-h-64 rounded-lg object-contain border"
                  />
                )}
                {n.link_url && (
                  <a
                    href={n.link_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-block text-blue-600 hover:text-blue-800 text-sm break-all"
                  >
                    🔗 {n.link_url}
                  </a>
                )}
                <p className="text-xs text-gray-400 mt-2 flex items-center gap-1.5">
                  {n.author_avatar && (
                    <img
                      src={n.author_avatar}
                      alt=""
                      className="h-5 w-5 rounded-full object-cover"
                    />
                  )}
                  <span>{n.author_name} · {formatTimestamp(n.created_at)}</span>
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
