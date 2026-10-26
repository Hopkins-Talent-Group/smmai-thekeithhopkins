import crypto from "node:crypto";

const algorithm = "aes-256-gcm";

function key() {
  const encoded = process.env.TOKEN_ENCRYPTION_KEY;
  if (!encoded) throw new Error("TOKEN_ENCRYPTION_KEY is required for provider credentials");
  const value = Buffer.from(encoded, "base64");
  if (value.length !== 32) throw new Error("TOKEN_ENCRYPTION_KEY must decode to 32 bytes");
  return value;
}

export function encryptSecret(plaintext: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(algorithm, key(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return [iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), ciphertext.toString("base64url")].join(".");
}

export function decryptSecret(encoded: string) {
  const [iv, tag, ciphertext] = encoded.split(".");
  if (!iv || !tag || !ciphertext) throw new Error("Invalid encrypted secret");
  const decipher = crypto.createDecipheriv(algorithm, key(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ciphertext, "base64url")), decipher.final()]).toString("utf8");
}
