// utils/media.ts
export function isImageMedia(url: string): boolean {
  try {
    const ext = url.split(".").pop()?.toLowerCase();
    return ["jpg", "jpeg", "png", "webp", "gif", "avif"].includes(ext || "");
  } catch {
    return false;
  }
}
