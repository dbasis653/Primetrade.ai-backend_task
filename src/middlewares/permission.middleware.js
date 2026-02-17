import { ApiError } from "../utils/api-error.js";
import { asyncHandler } from "../utils/async-handler.js";

// Global system-level role check (user vs global-admin)
export const verifyPermission = (roles = []) =>
  asyncHandler(async (req, res, next) => {
    if (!req.user?._id) {
      throw new ApiError(401, "Unauthorized request");
    }
    if (roles.includes(req.user.role)) {
      return next();
    }
    throw new ApiError(403, "You are not allowed to perform this action");
  });
