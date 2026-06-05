import mongoose from "mongoose";

const refreshTokenSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    tokenHash: { type: String, required: true, unique: true, index: true },
    expiresAt: { type: Date, required: true, index: true },
    createdByIp: { type: String, default: "" },
    createdByUserAgent: { type: String, default: "" },
    revokedAt: { type: Date, default: null },
    revokedByIp: { type: String, default: "" },
    replacedByTokenHash: { type: String, default: "" },
  },
  { timestamps: true }
);

refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RefreshToken = mongoose.model("RefreshToken", refreshTokenSchema);

