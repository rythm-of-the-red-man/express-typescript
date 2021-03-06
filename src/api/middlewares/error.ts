import httpStatus from "http-status";
import expressValidation from "express-validation";
import APIError from "../errors/api-error";
import { env } from "../../config/vars";
import { errorParams } from "../errors/extandable-error";
import { Request, Response } from "express";
/*
 * Error handler. Send stacktrace only during development
 * @public
 */

const handler = (err: errorParams, req: Request, res: Response): void => {
  if (!err.status) {
    err.status = 500;
  }
  const response = {
    code: err.status,
    message: err.message || httpStatus[err.status],
    errors: err.errors,
    stack: err.stack,
  };

  if (env !== "development") {
    delete response.stack;
  }

  res.status(err.status);
  res.json(response);
  return;
};

/**
 * If error is not an instanceOf APIError, convert it.
 * @public
 */
const converter = (
  err: errorParams,
  req: Request,
  res: Response
):  void => {
  let convertedError = err;

  if (err instanceof expressValidation.ValidationError) {
    convertedError = new APIError({
      message: "Validation Error",
      //@ts-ignore
      errors: err.errors,
      //@ts-ignore
      status: err.status,
      //@ts-ignore
      stack: err.stack,
    });
  } else if (!(err instanceof APIError)) {
    convertedError = new APIError({
      message: err.message,
      status: err.status,
      stack: err.stack,
    });
  }

  return handler(convertedError, req, res);
};

/**
 * Catch 404 and forward to error handler
 * @public
 */
const notFound = (req: Request, res: Response):void => {
  const err = new APIError({
    message: "Not found",
    status: httpStatus.NOT_FOUND,
  });
  return handler(err, req, res);
};

export default {
  notFound,
  handler,
  converter,
};
