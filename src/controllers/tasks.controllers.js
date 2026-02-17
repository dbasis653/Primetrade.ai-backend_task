import { User } from "../models/user.model.js";
import { Task } from "../models/task.models.js";
import { TaskMember } from "../models/projectmember.models.js";
import { Subtask } from "../models/subtask.models.js";

import { ApiResponse } from "../utils/api-response.js";
import { asyncHandler } from "../utils/async-handler.js";
import { ApiError } from "../utils/api-error.js";

import mongoose from "mongoose";

// Get all tasks for the authenticated user (formerly getProjects)
const getTasks = asyncHandler(async (req, res) => {
  // Global admin sees ALL tasks
  if (req.user.role === "global-admin") {
    const tasks = await Task.find({}).populate("assignedTo", "username fullName avatar");
    return res
      .status(200)
      .json(new ApiResponse(200, tasks, "Tasks fetched successfully"));
  }

  // Regular user sees only tasks they are a member of
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
          {
            $project: { taskmembers: 0 },
          },
          {
            $lookup: {
              from: "users",
              localField: "assignedTo",
              foreignField: "_id",
              as: "assignedTo",
              pipeline: [
                {
                  $project: { _id: 1, username: 1, fullName: 1, avatar: 1 },
                },
              ],
            },
          },
          {
            $addFields: {
              assignedTo: { $arrayElemAt: ["$assignedTo", 0] },
            },
          },
        ],
      },
    },
    {
      $unwind: "$task",
    },
    {
      $replaceRoot: { newRoot: "$task" },
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
// Only global-admin can create tasks (enforced at route level)
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

  // Ensure assigned user is a task member
  if (task.assignedTo) {
    const assignedUser = await User.findById(task.assignedTo).select("username");
    if (assignedUser) {
      await TaskMember.findOneAndUpdate(
        { user: task.assignedTo, task: task._id },
        { user: task.assignedTo, task: task._id, username: assignedUser.username },
        { upsert: true, new: true },
      );
    }
  }

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

  // Ensure assigned user is a task member
  if (updateData.assignedTo) {
    const assignedUser = await User.findById(task.assignedTo).select("username");
    if (assignedUser) {
      await TaskMember.findOneAndUpdate(
        { user: task.assignedTo, task: task._id },
        { user: task.assignedTo, task: task._id, username: assignedUser.username },
        { upsert: true, new: true },
      );
    }
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
  const { userId, email } = req.body;
  const { taskId } = req.params;

  if (!userId && !email) {
    throw new ApiError(400, "Provide userId or email");
  }

  const user = userId
    ? await User.findById(userId)
    : await User.findOne({ email });

  if (!user) {
    throw new ApiError(404, "User does not exist");
  }

  const taskMember = await TaskMember.findOneAndUpdate(
    {
      user: new mongoose.Types.ObjectId(user._id),
      task: new mongoose.Types.ObjectId(taskId),
    },
    {
      user: new mongoose.Types.ObjectId(user._id),
      task: new mongoose.Types.ObjectId(taskId),
      username: user.username,
    },
    {
      new: true,
      upsert: true,
    },
  ).populate("user", "username fullName avatar");

  return res
    .status(201)
    .json(new ApiResponse(201, taskMember, "Task member added successfully"));
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
              email: 1,
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
  deleteMember,
  createSubTask,
  updateSubTask,
  deleteSubTask,
};
