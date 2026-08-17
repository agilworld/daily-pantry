import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { resizeImageToDataUrl } from "../imageResize";

// jsdom does not implement canvas 2D rendering, so we stub the primitives the
// helper relies on and verify its control flow: loads via object URL, computes
// downscale-only dimensions preserving aspect ratio, draws on canvas, and
// prefers webp with the configured quality.

describe("resizeImageToDataUrl", () => {
  const originalCreateObjectURL = URL.createObjectURL;
  const originalRevokeObjectURL = URL.revokeObjectURL;
  const fakeDataUrl = "data:image/webp;base64,FAKEDATA";
  let drawnWidth = 0;
  let drawnHeight = 0;

  const fakeCanvas: Partial<HTMLCanvasElement> & { toDataURL: (type: string, quality?: number) => string } = {
    width: 0,
    height: 0,
    toDataURL: (type: string) => {
      return type === "image/webp" ? fakeDataUrl : "data:image/jpeg;base64,FAKEJPEG";
    },
  };

  beforeEach(() => {
    drawnWidth = 0;
    drawnHeight = 0;

    // Image + object URL stubs
    (globalThis as Record<string, unknown>).Image = class {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      src = "";
      width = 0;
      height = 0;
    };

    URL.createObjectURL = vi.fn(() => "blob:fake");
    URL.revokeObjectURL = vi.fn();

    // Canvas stubs
    document.createElement = vi.fn((tag: string) => {
      if (tag !== "canvas") {
        throw new Error(`Unexpected createElement call: ${tag}`);
      }
      const canvas = Object.create(fakeCanvas) as HTMLCanvasElement;
      canvas.width = 0;
      canvas.height = 0;
      return canvas;
    });

    (fakeCanvas as HTMLCanvasElement).getContext = vi.fn((kind: string) => {
      expect(kind).toBe("2d");
      return {
        drawImage: vi.fn((_img: unknown, _x: number, _y: number, w: number, h: number) => {
          drawnWidth = w;
          drawnHeight = h;
        }),
        fillStyle: "",
        fillRect: vi.fn(),
      } as unknown as CanvasRenderingContext2D;
    }) as unknown as HTMLCanvasElement["getContext"];
  });

  afterEach(() => {
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
    vi.restoreAllMocks();
  });

  it("downscales a large image to the max dimension preserving aspect ratio", async () => {
    const file = new File([new ArrayBuffer(8)], "photo.jpg", { type: "image/jpeg" });
    (globalThis as Record<string, unknown>).Image = class {
      onload: (() => void) | null = null;
      src = "";
      width = 0;
      height = 0;
      constructor() {
        queueMicrotask(() => {
          this.width = 4000;
          this.height = 2000;
          this.onload?.();
        });
      }
    };

    const result = await resizeImageToDataUrl(file, 1280, 0.85);

    // Scale = min(1, 1280/4000) = 0.32 → 1280 x 640
    expect(drawnWidth).toBe(1280);
    expect(drawnHeight).toBe(640);
    expect(result).toBe(fakeDataUrl);
    expect(URL.createObjectURL).toHaveBeenCalledWith(file);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:fake");
  });

  it("never upscales a small image", async () => {
    const file = new File([new ArrayBuffer(8)], "small.png", { type: "image/png" });
    (globalThis as Record<string, unknown>).Image = class {
      onload: (() => void) | null = null;
      src = "";
      width = 0;
      height = 0;
      constructor() {
        queueMicrotask(() => {
          this.width = 200;
          this.height = 100;
          this.onload?.();
        });
      }
    };

    const result = await resizeImageToDataUrl(file, 1280, 0.85);

    expect(drawnWidth).toBe(200);
    expect(drawnHeight).toBe(100);
    expect(result).toBe(fakeDataUrl);
  });

  it("throws when image fails to load", async () => {
    const file = new File([new ArrayBuffer(8)], "broken.png", { type: "image/png" });
    (globalThis as Record<string, unknown>).Image = class {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      src = "";
      width = 0;
      height = 0;
      constructor() {
        queueMicrotask(() => {
          this.onerror?.();
        });
      }
    };

    await expect(resizeImageToDataUrl(file)).rejects.toThrow("Failed to load image");
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:fake");
  });
});
