import { User } from "../models/user.model.js";
import { TaskMember } from "../models/projectmember.models.js";
import { ApiError } from "../utils/api-error.js";
import { asyncHandler } from "../utils/async-handler.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

// Task permission validation (replaces project permission)
export const validateTaskPermission = (roles = []) => {
  return asyncHandler(async (req, res, next) => {
    const { taskId } = req.params;

    if (!taskId) {
      throw new ApiError(400, "Task ID is missing");
    }

    //it is taskMember with a task, not exactly a task
    const taskMembership = await TaskMember.findOne({
      task: new mongoose.Types.ObjectId(taskId),
      user: new mongoose.Types.ObjectId(req.user._id),
    });

    if (!taskMembership) {
      throw new ApiError(400, "Task not found or you are not a member");
    }

    const givenRole = taskMembership?.role;

    req.user.role = givenRole;

    if (!roles.includes(givenRole)) {
      throw new ApiError(403, "You do not have access to perform this action");
    }

    next();
  });
};

// Legacy alias for backward compatibility during migration
export const validateProjectPermission = validateTaskPermission;
