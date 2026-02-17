import { Router } from "express";
import {
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  addMembersToTask,
  getTaskMembers,
  deleteMember,
  createSubTask,
  updateSubTask,
  deleteSubTask,
} from "../controllers/tasks.controllers.js";
import { validate } from "../middlewares/validator.middleware.js";
import {
  createTaskValidator,
  addMemberToTaskValidator,
} from "../validator/index.js";

import { verifyJWT } from "../middlewares/auth.middleware.js";
import { verifyPermission } from "../middlewares/permission.middleware.js";

const router = Router();

router.use(verifyJWT);
//every code after this line will all have verifyJWT

router
  .route("/")
  .get(getTasks)
  .post(
    verifyPermission(["global-admin"]),
    createTaskValidator(),
    validate,
    createTask,
  );

router
  .route("/:taskId")
  .get(getTaskById)
  .put(
    verifyPermission(["global-admin"]),
    createTaskValidator(),
    validate,
    updateTask,
  )
  .delete(verifyPermission(["global-admin"]), deleteTask);

router
  .route("/:taskId/members")
  .get(getTaskMembers)
  .post(
    verifyPermission(["global-admin"]),
    addMemberToTaskValidator(),
    validate,
    addMembersToTask,
  );

router
  .route("/:taskId/members/:userId")
  .delete(verifyPermission(["global-admin"]), deleteMember);

// Subtask routes
router.route("/:taskId/subtasks").post(createSubTask);

router
  .route("/:taskId/subtasks/:subtaskId")
  .put(updateSubTask)
  .delete(deleteSubTask);

export default router;
