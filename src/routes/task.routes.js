import { Router } from "express";
import {
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  addMembersToTask,
  getTaskMembers,
  updateMemberRole,
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
import { validateTaskPermission } from "../middlewares/permission.middleware.js";
import { AvailableUserRole, UserRolesEnum } from "../utils/constants.js";

const router = Router();

router.use(verifyJWT);
//every code after this line will all have verifyJWT

router
  .route("/")
  .get(getTasks)
  .post(createTaskValidator(), validate, createTask);
//GET & POST together bcz at the same route with a GET req one can get all tasks and with POST req it can also create a task

router
  .route("/:taskId")
  .get(validateTaskPermission(AvailableUserRole), getTaskById)
  .put(
    validateTaskPermission([UserRolesEnum.ADMIN, UserRolesEnum.MEMBER]),
    createTaskValidator(),
    validate,
    updateTask,
  )
  .delete(validateTaskPermission([UserRolesEnum.ADMIN]), deleteTask);
//.get(validateTaskPermission(AvailableUserRole), getTaskById)
//means ALL ROLE IS ABLE TO PERFORM
//validateTaskPermission([UserRolesEnum.ADMIN, UserRolesEnum.MEMBER]),
//means ADMIN & MEMBER IS ABLE TO PERFORM

router
  .route("/:taskId/members")
  .get(getTaskMembers)
  .post(
    validateTaskPermission([UserRolesEnum.ADMIN]),
    addMemberToTaskValidator(),
    validate,
    addMembersToTask,
  );

router
  .route("/:taskId/members/:userId")
  .put(validateTaskPermission([UserRolesEnum.ADMIN]), updateMemberRole)
  .delete(validateTaskPermission([UserRolesEnum.ADMIN]), deleteMember);

// Subtask routes
router
  .route("/:taskId/subtasks")
  .post(createSubTask);

router
  .route("/:taskId/subtasks/:subtaskId")
  .put(updateSubTask)
  .delete(deleteSubTask);

export default router;
