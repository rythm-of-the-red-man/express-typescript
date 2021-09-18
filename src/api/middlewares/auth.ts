import httpStatus from "http-status";
import passport from "passport";
import User, { UserDocument, UserModel, UserRoles } from "../models/user.model";
import APIError from "../errors/api-error";
import { NextFunction, Request, Response } from "express";


const handleJWT =
  (req: Request, res: Response, next: NextFunction, roles: any) =>
  async (err: APIError, user: UserDocument, info: string) => {
    const error = err || info;
    //@ts-ignore
    const logIn = Promise.promisify(req.logIn);
    const apiError = new APIError({
      message: error ? error.message : "Unauthorized",
      status: httpStatus.UNAUTHORIZED,
      stack: error ? error.stack : undefined,
    });

    try {
      if (error || !user) throw error;
      await logIn(user, { session: false });
    } catch (e) {
      return next(apiError);
    }

    if (roles === UserRoles.logged_user) {
      if (user.role !== "admin" && req.params.userId !== user._id.toString()) {
        apiError.status = httpStatus.FORBIDDEN;
        apiError.message = "Forbidden";
        return next(apiError);
      }
    } else if (!roles.includes(user.role)) {
      apiError.status = httpStatus.FORBIDDEN;
      apiError.message = "Forbidden";
      return next(apiError);
    } else if (err || !user) {
      return next(apiError);
    }

    req.user = user;

    return next();
  };

export const authorize =
  (roles?:UserRoles) =>
  (req: Request, res: Response, next: NextFunction) =>
    passport.authenticate(
      "jwt",
      { session: false },
      handleJWT(req, res, next, roles)
    )(req, res, next);

exports.oAuth = (service: string) =>
  passport.authenticate(service, { session: false });
