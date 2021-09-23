interface ExtendableErrorInterface extends Error {
  message: string;
  errors?: {
    field: string;
    location: string;
    messages: string[];
  }[];
  status?: number;
  isPublic?: boolean;
  isOperational: boolean;
  stack?: string;
}
export type errorParams = {
  message: string;
  errors?: {
    field: string;
    location: string;
    messages: string[];
  }[];
  status?: number;
  isPublic?: boolean;
  stack?: string;
};
class ExtendableError extends Error implements ExtendableErrorInterface {
  errors: { field: string; location: string; messages: string[]; }[];
  status: number;
  isPublic: boolean;
  isOperational: boolean;
  stack: string;
  constructor({ message, errors, status, isPublic, stack }: errorParams) {
    super(message);
    this.name = this.constructor.name;
    this.message = message;
    this.errors = errors || [];
    this.status = status || -1;
    this.isPublic = isPublic || false;
    this.isOperational = true; // This is required since bluebird 4 doesn't append it anymore.
    this.stack = stack || "No stack passed";
    // Error.captureStackTrace(this, this.constructor.name);
  }
}

export default ExtendableError;
