import mongoose, { Document, Model, ObjectId } from "mongoose";
import crypto from "crypto";
import moment from "moment-timezone";

export interface RefreshTokenDocument extends Document {
  token: string;
  userId: ObjectId;
  userEmail: string;
  expires: Date;
}

interface RefreshTokenModel extends Model<RefreshTokenDocument>{
  generate: (user: any) => RefreshTokenDocument;
}

/**
 * Refresh Token Schema
 * @private
 */
const refreshTokenSchema = new mongoose.Schema<RefreshTokenDocument, RefreshTokenModel>({
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
  generate(user): RefreshTokenDocument {
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
const RefreshToken = mongoose.model<RefreshTokenDocument, RefreshTokenModel>(
  "RefreshToken",
  refreshTokenSchema
);
export default RefreshToken;
