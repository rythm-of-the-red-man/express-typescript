import { NextFunction, Response, Request } from "express";
import httpStatus from "http-status";
import { omit } from "lodash";
import User, { UserDocument } from "../models/user.model";

/**
 * Load user and append to req.
 * @public
 */
export const load = async (
  req: Request,
  res: Response,
  next: NextFunction,
  id: string
) => {
  try {
    const user = await User.get(id);
    req.locals = { user };
    return next();
  } catch (error) {
    return next(error);
  }
};

/**
 * Get user
 * @public
 */
export const get = (req: Request, res: Response) =>
  res.json(req.locals.user.transform());

/**
 * Get logged in user info
 * @public
 */
export const loggedIn = (req: Request, res: Response) =>{
  if(req.user){
    return res.json(req.user.transform());
  }
}

/**
 * Create new user
 * @public
 */
export const create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = new User(req.body);
    const savedUser = await user.save();
    res.status(httpStatus.CREATED);
    res.json(savedUser.transform());
  } catch (error) {
    next(User.checkDuplicateEmail(error));
  }
};

/**
 * Replace existing user
 * @public
 */
export const replace = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { user } = req.locals;
    const newUser = new User(req.body);
    const ommitRole = user.role !== "admin" ? "role" : "";
    const newUserObject = omit(newUser.toObject(), "_id", ommitRole);

    await user.updateOne(newUserObject, { overwrite: true, upsert: true });
    const savedUser = await User.findById(user._id);
    if (savedUser) {
      res.json(savedUser.transform());
    }
  } catch (error) {
    next(User.checkDuplicateEmail(error));
  }
};

/**
 * Update existing user
 * @public
 */
export const update = (req: Request, res: Response, next: NextFunction) => {
  const ommitRole = req.locals.user.role !== "admin" ? "role" : "";
  const updatedUser = omit(req.body, ommitRole);
  const user = Object.assign(req.locals.user, updatedUser);

  user
    .save()
    .then((savedUser) => res.json(savedUser.transform()))
    .catch((e) => next(User.checkDuplicateEmail(e)));
};

/**
 * Get user list
 * @public
 */
export const list = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      page = "1",
      perPage = "15",
      name = undefined,
      email = undefined,
      role = undefined,
    } = req.query;
    const users = await User.list(
      page as string,
      perPage as string,
      name as string,
      email as string,
      role as any
    );
    const transformedUsers = users.map((user) => user.transform());
    res.json(transformedUsers);
  } catch (error) {
    next(error);
  }
};

/**
 * Delete user
 * @public
 */
export const remove = (req: Request, res: Response, next: NextFunction) => {
  const { user } = req.locals;

  user
    .remove()
    .then(() => res.status(httpStatus.NO_CONTENT).end())
    .catch((e) => next(e));
};
export default {
  remove,
  list,
  update,
  replace,
  create,
  loggedIn,
  get,
  load,
};
