import mongoose from "mongoose";

const teamMemberSchema = new mongoose.Schema(
  {
    teamId: { type: mongoose.Schema.Types.ObjectId, ref: "Team", required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    role: { type: String, enum: ["owner", "admin", "member"], default: "member" },
  },
  { timestamps: true }
);

teamMemberSchema.index({ teamId: 1, userId: 1 }, { unique: true });

export const TeamMember = mongoose.model("TeamMember", teamMemberSchema);

