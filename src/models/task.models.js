import mongoose, { Schema } from "mongoose";
import { AvailableTaskStatus, TaskStatusEnum } from "../utils/constants.js";

const taskSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: String,
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    assignedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    status: {
      type: String,
      enum: AvailableTaskStatus,
      default: TaskStatusEnum.TODO,
    },
    //ATTACHMENT:
    //This field means:
    // A task can have zero or more attachments (files)
    // Each attachment stores metadata, not the actual file:
    // where the file is stored
    // what type it is like "image/png" or "application/pdf"
    // how big it is
    attachments: {
      type: [
        {
          url: String,
          MimeType: String,
          size: Number,
        },
      ],
      default: [],
    },
  },
  { timestamps: true },
);

export const Task = mongoose.model("Task", taskSchema);
