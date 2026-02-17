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
    username: {
      type: String,
      default: "",
    },
  },
  { timestamps: true },
);

// Prevent the same user from being added to the same task twice at DB level
taskMemberSchema.index({ user: 1, task: 1 }, { unique: true });

export const TaskMember = mongoose.model("TaskMember", taskMemberSchema);

// Legacy export for backward compatibility during migration
export const ProjectMember = TaskMember;
