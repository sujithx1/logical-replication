import crypto from "crypto";

import { env } from "../config/env";

// 32-byte key for AES-256
const ENCRYPTION_KEY = crypto.createHash('sha256').update(env.ENCRYPTION_KEY).digest();

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

export const encrypt = (text: string): string => {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  
  const authTag = cipher.getAuthTag().toString("hex");
  
  // Format: iv_hex:auth_tag_hex:encrypted_data_hex
  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
};

export const decrypt = (encryptedText: string): string => {
  const parts = encryptedText.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted text format");
  }
  
  const iv = Buffer.from(parts[0]!, "hex");
  const authTag = Buffer.from(parts[1]!, "hex");
  const encryptedData = Buffer.from(parts[2]!, "hex");
  
  const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encryptedData, "hex" as any, "utf8");
  decrypted += decipher.final("utf8");
  
  return decrypted;
};
