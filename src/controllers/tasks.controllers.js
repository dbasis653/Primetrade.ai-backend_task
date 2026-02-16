import { User } from "../models/user.model.js";
import { Task } from "../models/task.models.js";
import { TaskMember } from "../models/projectmember.models.js";
import { Subtask } from "../models/subtask.models.js";

import { ApiResponse } from "../utils/api-response.js";
import { asyncHandler } from "../utils/async-handler.js";
import { ApiError } from "../utils/api-error.js";

import mongoose from "mongoose";
import { AvailableUserRole, UserRolesEnum } from "../utils/constants.js";

// Get all tasks for the authenticated user (formerly getProjects)
const getTasks = asyncHandler(async (req, res) => {
  // Get all tasks where the user is a member
  const tasks = await TaskMember.aggregate([
    {
      $match: {
        user: new mongoose.Types.ObjectId(req.user._id),
      },
    },
    {
      $lookup: {
        from: "tasks",
        localField: "task",
        foreignField: "_id",
        as: "task",
        pipeline: [
          {
            $lookup: {
              from: "taskmembers",
              localField: "_id",
              foreignField: "task",
              as: "taskmembers",
            },
          },
          {
            $addFields: {
              members: {
                $size: "$taskmembers",
              },
            },
          },
        ],
      },
    },
    {
      $unwind: "$task",
    },
    {
      $project: {
        task: {
          _id: 1,
          title: 1,
          description: 1,
          members: 1,
          createdBy: 1,
          status: 1,
          createdAt: 1,
        },
        role: 1,
        _id: 0,
      },
    },
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, tasks, "Tasks fetched successfully"));
});

// Get task by ID (formerly getProjectById)
const getTaskById = asyncHandler(async (req, res) => {
  const { taskId } = req.params;
  const task = await Task.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(taskId),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "assignedTo",
        foreignField: "_id",
        as: "assignedTo",
        pipeline: [
          {
            $project: {
              _id: 1,
              username: 1,
              fullName: 1,
              avatar: 1,
            },
          },
        ],
      },
    },
    {
      $lookup: {
        from: "subtasks",
        localField: "_id",
        foreignField: "task",
        as: "subtasks",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "createdBy",
              foreignField: "_id",
              as: "createdBy",
              pipeline: [
                {
                  $project: {
                    _id: 1,
                    username: 1,
                    fullName: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              createdBy: {
                $arrayElemAt: ["$createdBy", 0],
              },
            },
          },
        ],
      },
    },
    {
      $addFields: {
        assignedTo: {
          $arrayElemAt: ["$assignedTo", 0],
        },
      },
    },
  ]);

  if (!task || task.length === 0) {
    throw new ApiError(404, "Task not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, task[0], "Task fetched successfully"));
});

// Create a new task (formerly createProject)
const createTask = asyncHandler(async (req, res) => {
  const { title, description, assignedTo, status } = req.body;

  const files = req.files || [];

  const attachments = files.map((file) => {
    return {
      url: `${process.env.SERVER_URL}/images/${file.filename}`,
      MimeType: file.mimetype,
      size: file.size,
    };
  });

  const task = await Task.create({
    title,
    description,
    createdBy: new mongoose.Types.ObjectId(req.user._id),
    assignedTo: assignedTo
      ? new mongoose.Types.ObjectId(assignedTo)
      : undefined,
    assignedBy: new mongoose.Types.ObjectId(req.user._id),
    status,
    attachments,
  });

  // Creator of the task should also be ADMIN of the task
  await TaskMember.create({
    user: new mongoose.Types.ObjectId(req.user._id),
    task: new mongoose.Types.ObjectId(task._id),
    role: UserRolesEnum.ADMIN,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, task, "Task created successfully"));
});

// Update a task (formerly updateProject)
const updateTask = asyncHandler(async (req, res) => {
  const { title, description, assignedTo, status } = req.body;
  const { taskId } = req.params;

  const updateData = {};
  if (title !== undefined) updateData.title = title;
  if (description !== undefined) updateData.description = description;
  if (assignedTo !== undefined)
    updateData.assignedTo = new mongoose.Types.ObjectId(assignedTo);
  if (status !== undefined) updateData.status = status;

  const task = await Task.findByIdAndUpdate(taskId, updateData, { new: true });

  if (!task) {
    throw new ApiError(404, "Task not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, task, "Task updated successfully"));
});

// Delete a task (formerly deleteProject)
const deleteTask = asyncHandler(async (req, res) => {
  const { taskId } = req.params;

  const task = await Task.findByIdAndDelete(taskId);

  if (!task) {
    throw new ApiError(404, "Task not found");
  }

  // Also delete all task members
  await TaskMember.deleteMany({ task: new mongoose.Types.ObjectId(taskId) });

  return res
    .status(200)
    .json(new ApiResponse(200, task, "Task deleted successfully"));
});

// Add members to task (formerly addMembersToProject)
const addMembersToTask = asyncHandler(async (req, res) => {
  const { email, role } = req.body;
  const { taskId } = req.params;

  const user = await User.findOne({ email });

  if (!user) {
    throw new ApiError(404, "User does not exist");
  }

  await TaskMember.findOneAndUpdate(
    {
      user: new mongoose.Types.ObjectId(user._id),
      task: new mongoose.Types.ObjectId(taskId),
    },
    {
      user: new mongoose.Types.ObjectId(user._id),
      task: new mongoose.Types.ObjectId(taskId),
      role: role,
    },
    {
      new: true,
      upsert: true,
    },
  );

  return res
    .status(201)
    .json(new ApiResponse(201, {}, "Task member added successfully"));
});

// Get task members (formerly getProjectMembers)
const getTaskMembers = asyncHandler(async (req, res) => {
  const { taskId } = req.params;
  const task = await Task.findById(taskId);

  if (!task) {
    throw new ApiError(404, "Task not found");
  }

  const taskMembers = await TaskMember.aggregate([
    {
      $match: {
        task: new mongoose.Types.ObjectId(taskId),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "user",
        foreignField: "_id",
        as: "user",
        pipeline: [
          {
            $project: {
              _id: 1,
              username: 1,
              fullName: 1,
              avatar: 1,
            },
          },
        ],
      },
    },
    {
      $addFields: {
        user: {
          $arrayElemAt: ["$user", 0],
        },
      },
    },
    {
      $project: {
        task: 1,
        user: 1,
        role: 1,
        createdAt: 1,
        updatedAt: 1,
        _id: 0,
      },
    },
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, taskMembers, "Task members fetched"));
});

// Update member role (formerly updateMemberRole)
const updateMemberRole = asyncHandler(async (req, res) => {
  const { taskId, userId } = req.params;
  const { newRole } = req.body;

  if (!AvailableUserRole.includes(newRole)) {
    throw new ApiError(400, "Invalid Role");
  }

  let taskMember = await TaskMember.findOne({
    task: new mongoose.Types.ObjectId(taskId),
    user: new mongoose.Types.ObjectId(userId),
  });

  if (!taskMember) {
    throw new ApiError(400, "Task member not found");
  }

  taskMember = await TaskMember.findByIdAndUpdate(
    taskMember._id,
    {
      role: newRole,
    },
    {
      new: true,
    },
  );

  if (!taskMember) {
    throw new ApiError(400, "Task member not found");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, taskMember, "Task member role updated successfully"),
    );
});

// Delete member (formerly deleteMember)
const deleteMember = asyncHandler(async (req, res) => {
  const { taskId, userId } = req.params;

  let taskMember = await TaskMember.findOne({
    task: new mongoose.Types.ObjectId(taskId),
    user: new mongoose.Types.ObjectId(userId),
  });

  if (!taskMember) {
    throw new ApiError(400, "Task member not found");
  }

  taskMember = await TaskMember.findByIdAndDelete(taskMember._id);

  if (!taskMember) {
    throw new ApiError(400, "Task member not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, taskMember, "Task member removed successfully"));
});

// Subtask operations (to be implemented)
const createSubTask = asyncHandler(async (req, res) => {
  //test
});

const updateSubTask = asyncHandler(async (req, res) => {
  //test
});

const deleteSubTask = asyncHandler(async (req, res) => {
  //test
});

export {
  getTasks,
  createTask,
  getTaskById,
  updateTask,
  deleteTask,
  addMembersToTask,
  getTaskMembers,
  updateMemberRole,
  deleteMember,
  createSubTask,
  updateSubTask,
  deleteSubTask,
};
