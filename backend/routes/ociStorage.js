/**
 * Shared OCI Object Storage client + helper utilities.
 * Import this wherever you need to interact with OCI.
 *
 * Usage:
 *   const { objectStorageClient, deleteOciImage, OCI_NAMESPACE, OCI_BUCKET } = require("./ociStorage");
 */

const common = require("oci-common");
const os     = require("oci-objectstorage");

const OCI_NAMESPACE = process.env.OCI_NAMESPACE;
const OCI_BUCKET    = process.env.OCI_BUCKET_NAME;
const OCI_REGION    = process.env.OCI_REGION;

const ociProvider = new common.SimpleAuthenticationDetailsProvider(
  process.env.OCI_TENANCY_ID,
  process.env.OCI_USER_ID,
  process.env.OCI_FINGERPRINT,
  process.env.OCI_PRIVATE_KEY,
  null,
  common.Region.fromRegionId(OCI_REGION),
);

const objectStorageClient = new os.ObjectStorageClient({
  authenticationDetailsProvider: ociProvider,
});

/**
 * Extract the OCI object key from a proxy URL.
 * Proxy URLs look like: /api/upload/image-proxy?key=products%2Fabc.jpg
 * Returns "products/abc.jpg" or null if not a proxy URL.
 */
function extractOciKey(imageUrl) {
  if (!imageUrl) return null;
  try {
    // Handle both full URLs and relative paths
    const urlStr = imageUrl.startsWith("http")
      ? imageUrl
      : `http://localhost${imageUrl}`;
    const url    = new URL(urlStr);
    if (url.pathname.includes("image-proxy")) {
      return url.searchParams.get("key") || null;
    }
  } catch {
    // ignore
  }
  return null;
}

/**
 * Delete an OCI object by its proxy URL or raw key.
 * Silently ignores errors (product deletion should succeed even if OCI cleanup fails).
 */
async function deleteOciImage(imageUrl) {
  const key = extractOciKey(imageUrl) || imageUrl;
  if (!key || !key.startsWith("products/")) return; // safety: only delete product images

  try {
    await objectStorageClient.deleteObject({
      namespaceName: OCI_NAMESPACE,
      bucketName:    OCI_BUCKET,
      objectName:    key,
    });
    console.log(`[OCI] Deleted object: ${key}`);
  } catch (err) {
    // 404 = already gone, both are fine
    if (err?.statusCode !== 404) {
      console.warn(`[OCI] Failed to delete object "${key}":`, err?.message);
    }
  }
}

module.exports = { objectStorageClient, deleteOciImage, extractOciKey, OCI_NAMESPACE, OCI_BUCKET };