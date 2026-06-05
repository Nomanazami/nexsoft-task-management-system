import mongoose from "mongoose";

const activityLogSchema = new mongoose.Schema(
  {
    teamId: { type: mongoose.Schema.Types.ObjectId, ref: "Team", default: null, index: true },
    entityType: { type: String, enum: ["task", "team", "auth", "user"], required: true, index: true },
    entityId: { type: mongoose.Schema.Types.ObjectId, default: null, index: true },
    action: { type: String, required: true, index: true },
    message: { type: String, required: true, maxlength: 1000 },
    meta: { type: Object, default: {} },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  },
  { timestamps: true }
);

activityLogSchema.index({ teamId: 1, createdAt: -1 });

export const ActivityLog = mongoose.model("ActivityLog", activityLogSchema);

