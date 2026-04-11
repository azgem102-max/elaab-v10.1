import { Storage } from "@google-cloud/storage";

const REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";

const storageClient = new Storage({
  credentials: {
    audience: "replit",
    subject_token_type: "access_token",
    token_url: `${REPLIT_SIDECAR_ENDPOINT}/token`,
    type: "external_account",
    credential_source: {
      url: `${REPLIT_SIDECAR_ENDPOINT}/credential`,
      format: {
        type: "json",
        subject_token_field_name: "access_token",
      },
    },
    universe_domain: "googleapis.com",
  },
  projectId: "",
});

function getBucket() {
  const bucketId = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;
  if (!bucketId) throw new Error("DEFAULT_OBJECT_STORAGE_BUCKET_ID is not set");
  return storageClient.bucket(bucketId);
}

/**
 * Uploads avatar buffer to GCS.
 * Returns a proxy URL built from the caller-supplied baseUrl (scheme + host,
 * e.g. "https://example.replit.dev/api") so the URL is valid in every
 * environment — dev, preview, and production.
 *
 * @param userId  The user's ID (used as part of the object key).
 * @param buffer  Raw image bytes.
 * @param mimeType  The image MIME type (e.g. "image/png").
 * @param apiBaseUrl  The fully-qualified base of the API, e.g.
 *   "https://my-app.replit.dev/api". Derived from the Express request in
 *   the route handler so it is always correct regardless of deployment env.
 */
export async function uploadAvatar(
  userId: string,
  buffer: Buffer,
  mimeType: string,
  apiBaseUrl: string
): Promise<string> {
  const ext = mimeType === "image/png" ? "png" : mimeType === "image/webp" ? "webp" : "jpg";
  const key = `avatars/${userId}/${Date.now()}.${ext}`;
  const bucket = getBucket();
  const file = bucket.file(key);

  await file.save(buffer, {
    contentType: mimeType,
    metadata: { cacheControl: "public, max-age=31536000" },
  });

  // Build the proxy URL from the caller-provided base so it works in every env.
  const base = apiBaseUrl.replace(/\/$/, "");
  return `${base}/storage/avatar?key=${encodeURIComponent(key)}`;
}

/**
 * Downloads avatar bytes from GCS for the given key.
 * Used by the avatar proxy endpoint.
 */
export async function downloadAvatar(key: string): Promise<{ buffer: Buffer; contentType: string }> {
  const bucket = getBucket();
  const file = bucket.file(key);
  const [metadata] = await file.getMetadata();
  const [buffer] = await file.download();
  return {
    buffer,
    contentType: (metadata.contentType as string) ?? "image/jpeg",
  };
}
