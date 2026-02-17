import { body } from "express-validator";

//userRegisterValidator() does NOT send errors.
//It only defines validation rules.
const userRegisterValidator = () => {
  return [
    body("email")
      .trim()
      .notEmpty()
      .withMessage("Email is required")
      .isEmail()
      .withMessage("Email is invalid"),
    body("username")
      .trim()
      .notEmpty()
      .withMessage("Username is required")
      .isLowercase()
      .withMessage("Username must be in LOWERCASE")
      .isLength({ min: 3 })
      .withMessage("Username must be atleast 3 characters"),
    body("password").trim().notEmpty().withMessage("Password cannot be EMPTY"),
    body("fullname").optional().trim(),
  ];
};

const userLoginValidator = () => {
  return [
    body("email").optional().isEmail().withMessage("Email Invalid"),
    body("password").trim().notEmpty().withMessage("Provide valid password"),
  ];
};

const userChangeCurrentPasswordValidator = () => {
  return [
    body("oldPassword").notEmpty().withMessage("Old Password is required"),
    body("newPassword").notEmpty().withMessage("New Password is required"),
  ];
};

const userForgotPasswordValidator = () => {
  return [
    body("email")
      .notEmpty()
      .withMessage("Email is required")
      .isEmail()
      .withMessage("Invalid Email"),
  ];
};

const userResetForgotPasswordValidator = () => {
  return [body("newPassword").notEmpty().withMessage("Password is required")];
};

// Task validators (replaces project validators)
const createTaskValidator = () => {
  return [
    body("title").notEmpty().withMessage("Title is required"),
    body("description").optional(),
    body("assignedTo").optional(),
    body("status").optional(),
  ];
};

const addMemberToTaskValidator = () => {
  return [
    body("email")
      .trim()
      .notEmpty()
      .withMessage("Email is required")
      .isEmail()
      .withMessage("Invalid email"),
  ];
};

// Legacy validators (for backward compatibility during migration)
const createProjectValidator = createTaskValidator;
const addMemberToProjectValidator = addMemberToTaskValidator;

export {
  userRegisterValidator,
  userLoginValidator,
  userChangeCurrentPasswordValidator,
  userForgotPasswordValidator,
  userResetForgotPasswordValidator,
  createTaskValidator,
  addMemberToTaskValidator,
  createProjectValidator,
  addMemberToProjectValidator,
};
