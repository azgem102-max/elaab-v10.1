import { Storage } from "@google-cloud/storage";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";
const IS_DEV = process.env.NODE_ENV === "development" || !process.env.NODE_ENV;
// Use a local storage directory relative to the project root in dev mode
const LOCAL_STORAGE_DIR = path.resolve(__dirname, "../../local_storage");

let storageClient: Storage | null = null;

// Only initialize GCS client if not in dev mode or if explicitly requested
if (!IS_DEV) {
  storageClient = new Storage({
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
}

function getBucket() {
  if (!storageClient) {
    throw new Error("GCS Storage client not initialized in this environment");
  }
  const bucketId = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;
  if (!bucketId) throw new Error("DEFAULT_OBJECT_STORAGE_BUCKET_ID is not set");
  return storageClient.bucket(bucketId);
}

/**
 * Uploads avatar buffer. In development, uses local filesystem.
 */
export async function uploadAvatar(
  userId: string,
  buffer: Buffer,
  mimeType: string,
  apiBaseUrl: string
): Promise<string> {
  const ext = mimeType === "image/png" ? "png" : mimeType === "image/webp" ? "webp" : "jpg";
  const key = `avatars/${userId}/${Date.now()}.${ext}`;

  if (IS_DEV) {
    const fullPath = path.join(LOCAL_STORAGE_DIR, key);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, buffer);
  } else {
    const bucket = getBucket();
    const file = bucket.file(key);
    await file.save(buffer, {
      contentType: mimeType,
      metadata: { cacheControl: "public, max-age=31536000" },
    });
  }

  const base = apiBaseUrl.replace(/\/$/, "");
  return `${base}/storage/avatar?key=${encodeURIComponent(key)}`;
}

/**
 * Downloads avatar bytes. In development, reads from local filesystem.
 */
export async function downloadAvatar(key: string): Promise<{ buffer: Buffer; contentType: string }> {
  if (IS_DEV) {
    const fullPath = path.join(LOCAL_STORAGE_DIR, key);
    const buffer = await fs.readFile(fullPath);
    const ext = path.extname(key).toLowerCase();
    const contentType = ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";
    return { buffer, contentType };
  } else {
    const bucket = getBucket();
    const file = bucket.file(key);
    const [metadata] = await file.getMetadata();
    const [buffer] = await file.download();
    return {
      buffer,
      contentType: (metadata.contentType as string) ?? "image/jpeg",
    };
  }
}
