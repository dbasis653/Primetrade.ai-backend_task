import mongoose, { Schema } from "mongoose";

const taskMemberSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    task: {
      type: Schema.Types.ObjectId,
      ref: "Task",
      required: true,
    },
  },
  { timestamps: true },
);

export const TaskMember = mongoose.model("TaskMember", taskMemberSchema);

// Legacy export for backward compatibility during migration
export const ProjectMember = TaskMember;
