import { validationResult } from "express-validator";
import { ApiError } from "../utils/api-error.js";

//Concept:
//It will get a file, extract some error and process it.

export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) {
    return next();
  }

  const extractedErrors = [];
  errors.array().map((err) => extractedErrors.push({ [err.path]: err.msg }));
  //errors.array() convert the object into ARRAY even if it is not an array

  throw new ApiError(422, "Received data is not valid", extractedErrors);
};
