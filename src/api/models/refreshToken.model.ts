import mongoose, { Model, ObjectId, Schema } from "mongoose";
import crypto from "crypto";
import moment from "moment-timezone";

interface RefreshToken {
  token: string;
  userId: ObjectId;
  userEmail: string;
  expires: Date;
}

interface RefreshTokenMethods {
  generate: (user: any) => RefreshToken;
}

/**
 * Refresh Token Schema
 * @private
 */
const refreshTokenSchema = new mongoose.Schema<RefreshToken>({
  token: {
    type: String,
    required: true,
    index: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  userEmail: {
    type: "String",
    ref: "User",
    required: true,
  },
  expires: { type: Date },
});

refreshTokenSchema.statics = {
  /**
   * Generate a refresh token object and saves it into the database
   *
   * @param {User} user
   * @returns {RefreshToken}
   */
  generate(user): RefreshToken {
    const userId = user._id;
    const userEmail = user.email;
    const token = `${userId}.${crypto.randomBytes(40).toString("hex")}`;
    const expires = moment().add(30, "days").toDate();
    const tokenObject = new RefreshToken({
      token,
      userId,
      userEmail,
      expires,
    });
    tokenObject.save();
    return tokenObject;
  },
};

/**
 * @typedef RefreshToken
 */
const RefreshToken = mongoose.model<RefreshToken, any, RefreshTokenMethods>(
  "RefreshToken",
  refreshTokenSchema
);
export default RefreshToken;
