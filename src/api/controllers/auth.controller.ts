import httpStatus from "http-status";
import moment from "moment-timezone";
import { omit } from "lodash";
import User, { UserDocument } from "../models/user.model";
import RefreshToken from "../models/refreshToken.model";
import PasswordResetToken from "../models/passwordResetToken.model";
import { jwtExpirationInterval } from "../../config/vars";
import APIError from "../errors/api-error";
import emailProvider from "../services/emails/emailProvider";
import {  NextFunction, Response, Request } from "express";
import { errorParams } from "../errors/extandable-error";
/**
 * Returns a formated object with tokens
 * @private
 */
function generateTokenResponse(user: UserDocument, accessToken: string) {
  const tokenType = "Bearer";
  const refreshToken = RefreshToken.generate(user).token;
  const expiresIn = moment().add(jwtExpirationInterval, "minutes");
  return {
    tokenType,
    accessToken,
    refreshToken,
    expiresIn,
  };
}

/**
 * Returns jwt token if registration was successful
 * @public
 */
export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userData = omit(req.body, "role");
    const user = await new User(userData).save();
    const userTransformed = user.transform();
    const token = generateTokenResponse(user, user.token());
    res.status(httpStatus.CREATED);
    return res.json({ token, user: userTransformed });
  } catch (error) {
    return next(User.checkDuplicateEmail(error));
  }
};

/**
 * Returns jwt token if valid username and password is provided
 * @public
 */
export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { user, accessToken } = await User.findAndGenerateToken(req.body);
    if (user) {
      const token = generateTokenResponse(user, accessToken);
      const userTransformed = user.transform();
      return res.json({ token, user: userTransformed });
    }
  } catch (error) {
    return next(error);
  }
};

/**
 * login with an existing user or creates a new one if valid accessToken token
 * Returns jwt token
 * @public
 */
export const oAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { user } = req;
    if (user){

    const accessToken = user.token();
    const token = generateTokenResponse(user, accessToken);
    const userTransformed = user.transform();
    return res.json({ token, user: userTransformed });
  }

  } catch (error) {
    return next(error);
  }
};

/**
 * Returns a new jwt when given a valid refresh token
 * @public
 */
export const refresh = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, refreshToken } = req.body;
    const refreshObject = await RefreshToken.findOneAndRemove({
      userEmail: email,
      token: refreshToken,
    });
    const { user, accessToken } = await User.findAndGenerateToken({
      email,
      refreshObject,
    });
    if (user){
      const response = generateTokenResponse(user, accessToken);
      return res.json(response);
    }
  } catch (error) {
    return next(error);
  }
};

export const sendPasswordReset = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email }).exec();

    if (user) {
      //@ts-ignore
      const passwordResetObj = await PasswordResetToken.generate(user);
      emailProvider.sendPasswordReset(passwordResetObj);
      res.status(httpStatus.OK);
      return res.json("success");
    }
    throw new APIError({
      status: httpStatus.UNAUTHORIZED,
      message: "No account found with that email",
    });
  } catch (error) {
    return next(error);
  }
};

export const resetPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, password, resetToken } = req.body;
    const resetTokenObject = await PasswordResetToken.findOneAndRemove({
      userEmail: email,
      resetToken,
    });

    const err:errorParams = {
      status: httpStatus.UNAUTHORIZED,
      isPublic: true,
      message:'',
    };
    if (!resetTokenObject) {
      err.message = "Cannot find matching reset token";
      throw new APIError(err);
    }
    if (moment().isAfter(resetTokenObject.expires)) {
      err.message = "Reset token is expired";
      throw new APIError(err);
    }

    const user = await User.findOne({
      email: resetTokenObject.userEmail,
    }).exec();
    if(user){
      user.password = password;
      await user.save();
      emailProvider.sendPasswordChangeEmail(user);
  
      res.status(httpStatus.OK);
      return res.json("Password Updated");
    }
  } catch (error) {
    return next(error);
  }
};
