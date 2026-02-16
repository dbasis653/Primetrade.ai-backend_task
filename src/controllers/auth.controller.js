import { User } from "../models/user.model.js";
import { ApiResponse } from "../utils/api-response.js";
import { asyncHandler } from "../utils/async-handler.js";
import { ApiError } from "../utils/api-error.js";
import {
  emailVerificationMailContent,
  forgotPasswordMailContent,
  sendEmail,
} from "../utils/mail.js";
import jwt from "jsonwebtoken";
import crypto from "crypto";

// import { use } from "react.js";

const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    user.accessToken = accessToken;

    await user.save({ validateBeforeSave: false });
    //validateBeforeSave: false BCZ --> we dont want to validate other User field

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(500, "Access and Refresh Token generation failed");
  }
};

const registerUser = asyncHandler(async (req, res) => {
  //receive the data
  const { email, username, password, role } = req.body;

  //validate user
  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (existedUser) {
    throw new ApiError(409, "User with this email already exist", []);
  }

  //it is like: emai: email, password: password, i.e
  //take eamil value and save in the DB with similar field-name
  const user = await User.create({
    email,
    password,
    username,
    isEmailVerified: false,
  });

  //Now generate TEMPORARY_TOKEN to sent to the user
  //user = actual document to be store in the MongoDB, So
  //userSchema.methods.generateTemporaryToken = function() {}
  //it specify that every DOCUMENTS created for 'User' using the userSchema can use the generateTemporaryToken
  const { unHashedToken, hashedToken, tokenExpiry } =
    user.generateTemporaryToken();
  //return { unHashedToken, hashedToken, tokenExpiry };
  // these are returned when run generateTemporaryToken()

  //Store the HASHED TOKEN
  user.emailVerificationToken = hashedToken;
  user.emailVerificationExpiry = tokenExpiry;

  await user.save({ validateBeforeSave: false });

  //send an email so that SAME TOKEN CAN BE SENT TO THE USER
  await sendEmail({
    email: user?.email,
    subject: "Verify your mail",
    mailGenContent: emailVerificationMailContent(
      user.username,
      `${req.protocol}://${req.get("host")}/api/v1/auth/verify-email/${unHashedToken}`,
    ),
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken -forgotPasswordToken -forgotPasswordExpiry -emailVerificationToken -emailVerificationExpiry",
    //field with ‘-’ will be ignored
  );
  // 👉 It fetches the same user again from the database,
  // 👉 but removes sensitive fields,
  // 👉 so it is safe to send back to the client.

  if (!createdUser) {
    throw new ApiError(500, " Problem in registering user");
  }

  return res
    .status(201)
    .json(
      new ApiResponse(
        200,
        { user: createdUser },
        "SignUp successfully. Verification mail sent on your mail",
      ),
    );
});

const login = asyncHandler(async (req, res) => {
  //taking data from FRONTEND
  const { email, password, username } = req.body;

  if (!email) {
    throw new ApiError(400, "Email is required");
  }

  //find the data
  const user = await User.findOne({ email });

  if (!user) {
    throw new ApiError(400, "User doesnot exist");
  }

  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(400, "Invalid credentials");
  }

  //generate TOKENS
  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id,
  );

  //send the tokens
  const loggedinUser = await User.findById(user._id).select(
    "-password -refreshToken -forgotPasswordToken -forgotPasswordExpiry -emailVerificationToken -emailVerificationExpiry",
  );

  //set cookies with tokens
  //below code means:
  //these are secure COOKIES only browser can access
  const options = {
    httpOnly: true,
    secure: true,
  };
  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedinUser,
          accessToken,
          refreshToken,
        },
        "User logged in successfully",
      ),
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  //Step1:
  //Get the information
  await User.findByIdAndUpdate(
    //Find the id
    req.user._id,
    //below line will be for CHANGING THE FIELD
    {
      $set: {
        refreshToken: "",
      },
    },
    {
      new: true,
      //once everything is done GIVE ME THE UPDATED OBJECT
    },
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  //Send the response to the logout request
  //by clearing the cookies
  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User Loggedout"));
});

//for
//- `GET /current-user` - Get current user info (secured)
const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "Current user fetched successfully"));
});

//for
//- `GET /verify-email/:verificationToken` - Email verification
const verifyEmail = asyncHandler(async (req, res) => {
  //take the Token info from the Verify email url
  //undefined://localhost:8000/api/v1/auth/verify-email/4af38e3fed1f0923a2dcdf3aa455c1a2a5240d75
  //last part of the url is the Token
  //.params let you access the URL
  const { verificationToken } = req.params;
  //This { verificationToken } is from AUTH.ROUTES.JS
  //router.route("/verify-email/verificationToken").get(verifyEmail);
  //("/verify-email/verificationToken") this 'verificationToken' must be same with { verificationToken }

  if (!verificationToken) {
    throw new ApiError(400, "Email verification Token is missing");
  }

  //we login a user, HASHED TOKEN is stored in the DB
  //UNHASHED TOKEN is sent to the user
  //Now hash that unhashed token
  let hashedToken = crypto
    .createHash("sha256")
    .update(verificationToken)
    .digest("hex");

  const user = await User.findOne({
    emailVerificationToken: hashedToken,
    emailVerificationExpiry: { $gt: Date.now() },
    //it means value in emailVerificationExpiry is greated than Date.now()
  });

  if (!user) {
    throw new ApiError(400, "Token is invalid or Expired");
  }

  user.emailVerificationToken = undefined;
  user.emailVerificationExpiry = undefined;
  //so that unnecessary values dont present there

  user.isEmailVerified = true;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, { isEmailVerified: true }, "Email is verified"));
});

//for
//- `POST /resend-email-verification` - Resend verification email (secured)
const resendEmailVerification = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user?._id);

  if (!user) {
    throw new ApiError(404, "User doesnot exist");
  }

  if (user.isEmailVerified) {
    throw new ApiError(409, " Email already verified");
  }

  const { unHashedToken, hashedToken, tokenExpiry } =
    user.generateTemporaryToken();

  //Store the HASHED TOKEN
  user.emailVerificationToken = hashedToken;
  user.emailVerificationExpiry = tokenExpiry;

  await user.save({ validateBeforeSave: false });

  await sendEmail({
    email: user?.email,
    subject: "Verify your mail",
    mailGenContent: emailVerificationMailContent(
      user.username,
      `${req.protocol}://${req.get("host")}/api/v1/auth/verify-email/${unHashedToken}`,
    ),
  });

  return res
    .status(200)
    .json(
      new ApiResponse(200, {}, "Verification mail has been sent to your email"),
    );
});

//for
//- `POST /refresh-token` - Refresh access token
const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorised Access");
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET,
    );

    const user = await User.findById(decodedToken?._id);
    //Take _id from decodedToken assuming it exists, and look for a user with that ID in the database.

    if (!user) {
      throw new ApiError(401, "Invalid Refresh Token");
    }

    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh Token expired");
    }

    const options = {
      httpOnly: true,
      secure: true,
    };

    const { accessToken, refreshToken: newRefreshToken } =
      await generateAccessAndRefreshToken(user._id);

    //update the database
    user.refreshToken = newRefreshToken;
    await user.save();

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken: newRefreshToken },
          "Access token refreshed",
        ),
      );
  } catch (error) {
    throw new ApiError(401, "Invalid Refreshed Token expired");
  }
});

const forgotPasswordRequest = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });

  if (!user) {
    throw new ApiError(404, "User doesnot exist", []);
  }

  const { unHashedToken, hashedToken, tokenExpiry } =
    user.generateTemporaryToken();
  user.forgotPasswordToken = hashedToken;
  user.forgotPasswordExpiry = tokenExpiry;

  await user.save({ validateBeforeSave: false });

  await sendEmail({
    email: user?.email,
    subject: "Reset Password request",
    mailGenContent: forgotPasswordMailContent(
      user.username,
      `${process.env.FORGOT_PASSWORD_REDIRECT_URL}/${unHashedToken}`,
    ),
  });

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        {},
        "Password reset mail has been sent to your email",
      ),
    );
});

//- `POST /reset-password/:resetToken` - Reset forgotten password
const resetForgotPassword = asyncHandler(async (req, res) => {
  const { resetToken } = req.params;
  const { newPassword } = req.body;

  let hashedToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  const user = await User.findOne({
    forgotPasswordToken: hashedToken,
    forgotPasswordExpiry: { $gt: Date.now() },
  });

  if (!user) {
    throw new ApiError(489, "Token is invalid or expired");
  }

  user.forgotPasswordExpiry = undefined;
  user.forgotPasswordToken = undefined;

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password reset successfully"));
});

//- `POST /change-password` - Change user password (secured)
const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  const user = await User.findById(req.user?._id);
  const isPasswordValid = await user.isPasswordCorrect(oldPassword);

  if (!isPasswordValid) {
    throw new ApiError(400, "Invalid old password");
  }

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"));
});

export {
  registerUser,
  login,
  logoutUser,
  getCurrentUser,
  verifyEmail,
  resendEmailVerification,
  refreshAccessToken,
  forgotPasswordRequest,
  resetForgotPassword,
  changeCurrentPassword,
};
