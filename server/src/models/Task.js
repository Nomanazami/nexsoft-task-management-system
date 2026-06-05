import mongoose from "mongoose";

const taskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, default: "", maxlength: 5000 },
    priority: { type: String, enum: ["low", "medium", "high"], default: "medium", index: true },
    status: { type: String, enum: ["todo", "in_progress", "completed"], default: "todo", index: true },
    dueDate: { type: Date, default: null, index: true },

    teamId: { type: mongoose.Schema.Types.ObjectId, ref: "Team", default: null, index: true },
    assigneeIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", index: true }],

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    completedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true }
);

taskSchema.index({ title: "text", description: "text" });
taskSchema.index({ teamId: 1, status: 1, priority: 1, dueDate: 1, createdAt: -1 });

export const Task = mongoose.model("Task", taskSchema);

