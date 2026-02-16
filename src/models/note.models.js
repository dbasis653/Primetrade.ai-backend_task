import mongoose, { Schema } from "mongoose";

const taskNoteSchema = new Schema(
  {
    task: {
      type: Schema.Types.ObjectId,
      ref: "Task",
      required: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
  },
  { timestamps: true },
);

export const TaskNote = mongoose.model("TaskNote", taskNoteSchema);

// Legacy export for backward compatibility during migration
export const ProjectNote = TaskNote;
