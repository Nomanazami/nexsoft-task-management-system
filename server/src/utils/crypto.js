import crypto from "crypto";

export function sha256(input) {
  return crypto.createHash("sha256").update(String(input)).digest("hex");
}

