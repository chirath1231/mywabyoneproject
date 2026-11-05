/**
 * Local disk image storage (replaces Oracle Cloud Object Storage).
 *
 * Files live in UPLOAD_DIR (default: <backend>/uploads, in Docker /app/uploads,
 * which docker-compose mounts as a persistent volume on the VM).
 *
 * Image URLs keep the same shape as before:
 *   /api/upload/image-proxy?key=products%2F<uuid>.<ext>
 */

const fs   = require("fs");
const path = require("path");

const UPLOAD_DIR = path.resolve(
  process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads"),
);

// Allowed image types. SVG is deliberately excluded (it can carry scripts).
const MIME_BY_EXT = {
  jpg:  "image/jpeg",
  jpeg: "image/jpeg",
  png:  "image/png",
  gif:  "image/gif",
  webp: "image/webp",
  avif: "image/avif",
  bmp:  "image/bmp",
};
const EXT_BY_MIME = {
  "image/jpeg": "jpg",
  "image/png":  "png",
  "image/gif":  "gif",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/bmp":  "bmp",
};

// Only "products/<uuid>.<ext>" keys are valid — blocks path traversal.
const KEY_RE = /^products\/[0-9a-f-]{36}\.(jpg|jpeg|png|gif|webp|avif|bmp)$/;

fs.mkdirSync(path.join(UPLOAD_DIR, "products"), { recursive: true });
console.log(`[Storage] Local image storage at ${UPLOAD_DIR}`);

function isValidKey(key) {
  return typeof key === "string" && KEY_RE.test(key);
}

function keyToPath(key) {
  return path.join(UPLOAD_DIR, ...key.split("/"));
}

/** Extract "products/abc.jpg" from ".../api/upload/image-proxy?key=products%2Fabc.jpg" */
function extractKey(imageUrl) {
  if (!imageUrl) return null;
  try {
    const url = new URL(imageUrl, "http://localhost");
    if (url.pathname.includes("image-proxy")) return url.searchParams.get("key");
  } catch {
    // ignore
  }
  return null;
}

/** Delete an image by its proxy URL or raw key. Never throws. */
async function deleteImage(imageUrl) {
  const key = extractKey(imageUrl) || imageUrl;
  if (!isValidKey(key)) return;
  try {
    await fs.promises.unlink(keyToPath(key));
    console.log(`[Storage] Deleted ${key}`);
  } catch (err) {
    if (err.code !== "ENOENT") console.warn(`[Storage] Failed to delete "${key}":`, err.message);
  }
}

module.exports = {
  UPLOAD_DIR,
  MIME_BY_EXT,
  EXT_BY_MIME,
  isValidKey,
  keyToPath,
  extractKey,
  deleteImage,
};
