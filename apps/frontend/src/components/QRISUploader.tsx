import { useRef, useState } from "react";

interface Props {
  currentImage: string;
  onImageChange: (base64: string) => void;
}

export function QRISUploader({ currentImage, onImageChange }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = (file: File) => {
    setError(null);

    if (file.size > 2 * 1024 * 1024) {
      setError("Image must be under 2MB");
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      onImageChange(reader.result as string);
    };
    reader.onerror = () => {
      setError("Failed to read image");
    };
    reader.readAsDataURL(file);
  };

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
        className="hidden"
      />

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex-1 px-3 py-2 border rounded-lg text-sm text-gray-700 hover:bg-gray-50"
        >
          📷 Take Photo
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex-1 px-3 py-2 border rounded-lg text-sm text-gray-700 hover:bg-gray-50"
        >
          📁 Choose File
        </button>
      </div>

      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}

      {currentImage && (
        <div className="mt-2 flex justify-center">
          <img
            src={currentImage}
            alt="QRIS preview"
            className="w-32 h-32 object-contain border rounded-lg"
          />
        </div>
      )}
    </div>
  );
}
