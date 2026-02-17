// System-level (global) roles stored on the User document itself
export const UserSystemRoles = {
  ADMIN: "global-admin",
  USER: "user",
};

export const AvailableUserSystemRoles = Object.values(UserSystemRoles);

export const TaskStatusEnum = {
  TODO: "todo",
  IN_PROGRESS: "in_progress",
  DONE: "done",
};

export const AvailableTaskStatus = Object.values(TaskStatusEnum);
