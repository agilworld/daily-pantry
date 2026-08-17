// Resize an image file to a max dimension (default 1280px) as a JPEG/WebP
// data URL. Preserves aspect ratio + quality (0.85). Returns a data URL.
// Used for note images, avatars, and QRIS before upload.

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };
    img.src = url;
  });
}

export async function resizeImageToDataUrl(
  file: File,
  maxDimension = 1280,
  quality = 0.85,
): Promise<string> {
  const img = await loadImage(file);

  // Only downscale (never upscale) so small images aren't blurred.
  const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
  const targetWidth = Math.max(1, Math.round(img.width * scale));
  const targetHeight = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas is not supported");
  }

  ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

  // Prefer WebP (smaller output), fall back to JPEG. Alpha-channel PNGs/GIFs
  // get flattened to the default transparent-black canvas in JPEG — composite
  // onto a white background first so they export cleanly.
  const supportsWebp = canvas.toDataURL("image/webp").startsWith("data:image/webp");
  if (supportsWebp) {
    return canvas.toDataURL("image/webp", quality);
  }
  const temp = document.createElement("canvas");
  temp.width = targetWidth;
  temp.height = targetHeight;
  const tempCtx = temp.getContext("2d");
  if (!tempCtx) {
    throw new Error("Canvas is not supported");
  }
  tempCtx.fillStyle = "#ffffff";
  tempCtx.fillRect(0, 0, targetWidth, targetHeight);
  tempCtx.drawImage(canvas, 0, 0);
  return temp.toDataURL("image/jpeg", quality);
}
