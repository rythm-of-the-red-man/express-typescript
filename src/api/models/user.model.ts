import mongoose, { Model, Document } from "mongoose";
import httpStatus from "http-status";
import { omitBy, isNil } from "lodash";
import bcrypt from "bcryptjs";
import moment from "moment-timezone";
import jwt from "jwt-simple";
//@ts-ignore
import uuidv4 from "uuid/v4";
import APIError from "../errors/api-error";
import { env, jwtSecret, jwtExpirationInterval } from "../../config/vars";
import { errorParams } from "../errors/extandable-error";
import RefreshToken, {RefreshTokenDocument} from "./refreshToken.model";

export interface UserDocument extends Document {
  email: string;
  password: string;
  name: string;
  services: {
    facebook: string;
    google: string;
  };
  picture: string;
  role: "user" | "admin";

  get: (id: string) => UserDocument;
  findAndGenerateToken: (options: {
    email: string;
    password?: string;
    refreshObject: RefreshTokenDocument;
  }) => Promise<{ user: UserDocument | null; accessToken: string }>;
  list: (
    page: string,
    perPage: string,
    name: string,
    email: string,
    role: UserRoles
  ) => Promise<UserDocument[]>;
  checkDuplicateEmail: (error:any) => any;
  oAuthLogin: (
    service: Services,
    id: string,
    email: string,
    name: string,
    picture: string) => Promise<UserDocument>;
  getRoles: () => UserRoles;
  passwordMatches: (password: string) => boolean;
  token: () => string;
  transform: ()=> any
}

export interface UserModel extends Model<UserDocument> {
  get: (id: string) => UserDocument;
  findAndGenerateToken: (options: {
    email: string;
    password?: string;
    refreshObject: RefreshTokenDocument;
  }) => Promise<{ user: UserDocument | null; accessToken: string }>;
  list: (
    page: string,
    perPage: string,
    name: string,
    email: string,
    role: UserRoles
  ) => Promise<UserDocument[]>;
  checkDuplicateEmail: (error:any) => any;
  oAuthLogin: (
    service: Services,
    id: string,
    email: string,
    name: string,
    picture: string) => Promise<UserDocument>;
  getRoles: () => UserRoles;
  passwordMatches: (password: string) => boolean;
  token: () => string;
}
export enum Services{
  facebook="facebook",
  google="google"
}
// export type UserRoles = ["user", "admin"];
export enum UserRoles {
  user="user",
  admin="admin",
  logged_user='_loggedUser',
}
// type UserModel = Model<User,any,UserMethods>

/**
 * User Schema
 * @private
 */
const userSchema = new mongoose.Schema<UserDocument, UserModel>(
  {
    email: {
      type: String,
      match: /^\S+@\S+\.\S+$/,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
      maxlength: 128,
    },
    name: {
      type: String,
      maxlength: 128,
      index: true,
      trim: true,
    },
    services: {
      facebook: String,
      google: String,
    },
    role: {
      type: String,
      enum: UserRoles,
      default: "user",
    },
    picture: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

/**
 * Add your
 * - pre-save hooks
 * - validations
 * - virtuals
 */
userSchema.pre("save", async function save(next) {
  try {
    if (!this.isModified("password")) return next();

    const rounds = env === "test" ? 1 : 10;

    const hash = await bcrypt.hash(this.password, rounds);
    this.password = hash;

    return next();
  } catch (error) {
    return next(error as Error);
  }
});

/**
 * Methods
 */
userSchema.method({
  transform() {
    const transformed: { [key: string]: any } = {};
    const fields = ["id", "name", "email", "picture", "role", "createdAt"];

    fields.forEach((field: string) => {
      transformed[field] = this.get(field);
    });

    return transformed;
  },

  token() {
    const payload = {
      exp: moment().add(jwtExpirationInterval, "minutes").unix(),
      iat: moment().unix(),
      sub: this._id,
    };
    return jwt.encode(payload, jwtSecret);
  },

  async passwordMatches(password: string) {
    return bcrypt.compare(password, this.password);
  },
});

/**
 * Statics
 */
userSchema.statics = {
  /**
   * Get user
   *
   * @param {ObjectId} id - The objectId of user.
   * @returns {Promise<User, APIError>}
   */
  async get(id: string): Promise<UserDocument> {
    let user;

    if (mongoose.Types.ObjectId.isValid(id)) {
      user = await this.findById(id).exec();
    }
    if (user) {
      return user;
    }

    throw new APIError({
      message: "User does not exist",
      status: httpStatus.NOT_FOUND,
    });
  },

  /**
   * Find user by email and tries to generate a JWT token
   *
   * @param {ObjectId} id - The objectId of user.
   * @returns {Promise<User, APIError>}
   */
  async findAndGenerateToken(options: {
    email: string;
    password?: string;
    refreshObject: RefreshTokenDocument;
  }): Promise<{ user: UserDocument | null; accessToken: string }> {
    const { email, password, refreshObject } = options;
    if (!email)
      throw new APIError({
        message: "An email is required to generate a token",
      });

    const user: UserDocument | null = await this.findOne({ email }).exec();
    const err: errorParams = {
      message: "",
      status: httpStatus.UNAUTHORIZED,
      isPublic: true,
    };
    if (password) {
      // if (user && (await user.passwordMatches(password))) {
      if (user && (await user.passwordMatches(password))) {
        return { user, accessToken: user.token() };
      }
      err.message = "Incorrect email or password";
    } else if (refreshObject && refreshObject.userEmail === email) {
      if (moment(refreshObject.expires).isBefore()) {
        err.message = "Invalid refresh token.";
      } else if (user) {
        return { user, accessToken: user.token() };
      }
    } else {
      err.message = "Incorrect email or refreshToken";
    }
    throw new APIError(err);
  },

  /**
   * List users in descending order of 'createdAt' timestamp.
   *
   * @param {number} skip - Number of users to be skipped.
   * @param {number} limit - Limit number of users to be returned.
   * @returns {Promise<User[]>}
   */
  async list(
    page: number = 1,
    perPage: number = 30,
    name: string,
    email: string,
    role: UserRoles
  ): Promise<UserDocument[]> {
    const options = omitBy({ name, email, role }, isNil);
    return this.find(options)
      .sort({ createdAt: -1 })
      .skip(perPage * (page - 1))
      .limit(perPage)
      .exec();
  },

  /**
   * Return new validation error
   * if error is a mongoose duplicate key error
   *
   * @param {Error} error
   * @returns {Error|APIError}
   */
  checkDuplicateEmail(error: any) {
    if (error.name === "MongoError" && error.code === 11000) {
      return new APIError({
        message: "Validation Error",
        errors: [
          {
            field: "email",
            location: "body",
            messages: ['"email" already exists'],
          },
        ],
        status: httpStatus.CONFLICT,
        isPublic: true,
        stack: error.stack,
      });
    }
    return error;
  },

  async oAuthLogin(
    service: "facebook" | "google",
    id: string,
    email: string,
    name: string,
    picture: string
  ) {
    const user: UserDocument | null = await this.findOne({
      $or: [{ [`services.${service}`]: id }, { email }],
    });
    if (user) {
      user.services[service] = id;
      if (!user.name) user.name = name;
      if (!user.picture) user.picture = picture;
      return user.save();
    }
    const password = uuidv4();
    return this.create({
      services: { [service]: id },
      email,
      password,
      name,
      picture,
    });
  },
};

/**
 * @typedef User
 */
export default mongoose.model<UserDocument, UserModel>("User", userSchema);
