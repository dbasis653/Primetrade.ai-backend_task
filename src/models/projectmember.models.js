import mongoose, { Schema } from "mongoose";
import { AvailableUserRole, UserRolesEnum } from "../utils/constants.js";

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
    role: {
      type: String,
      enum: AvailableUserRole,
      //"This field can have only one value from a fixed list of allowed values."
      default: UserRolesEnum.MEMBER,
    },
  },
  { timestamps: true },
);

export const TaskMember = mongoose.model("TaskMember", taskMemberSchema);

// Legacy export for backward compatibility during migration
export const ProjectMember = TaskMember;
