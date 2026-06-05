import mongoose from "mongoose";

const teamInviteSchema = new mongoose.Schema(
  {
    teamId: { type: mongoose.Schema.Types.ObjectId, ref: "Team", required: true, index: true },
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    token: { type: String, required: true, unique: true, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    expiresAt: { type: Date, required: true, index: true },
    acceptedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

teamInviteSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const TeamInvite = mongoose.model("TeamInvite", teamInviteSchema);

