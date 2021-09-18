import Joi from "joi";
import { UserRoles } from "../models/user.model";

// GET /v1/users
export const listUsers = {
  query: {
    page: Joi.number().min(1),
    perPage: Joi.number().min(1).max(100),
    name: Joi.string(),
    email: Joi.string(),
    role: Joi.string().valid(UserRoles),
  },
};

// POST /v1/users
export const createUser = {
  body: {
    email: Joi.string().email().required(),
    password: Joi.string().min(6).max(128).required(),
    name: Joi.string().max(128),
    role: Joi.string().valid(UserRoles),
  },
};

// PUT /v1/users/:userId
export const replaceUser = {
  body: {
    email: Joi.string().email().required(),
    password: Joi.string().min(6).max(128).required(),
    name: Joi.string().max(128),
    role: Joi.string().valid(UserRoles),
  },
  params: {
    userId: Joi.string()
      .regex(/^[a-fA-F0-9]{24}$/)
      .required(),
  },
};

// PATCH /v1/users/:userId
export const updateUser = {
  body: {
    email: Joi.string().email(),
    password: Joi.string().min(6).max(128),
    name: Joi.string().max(128),
    role: Joi.string().valid(UserRoles),
  },
  params: {
    userId: Joi.string()
      .regex(/^[a-fA-F0-9]{24}$/)
      .required(),
  },
};
