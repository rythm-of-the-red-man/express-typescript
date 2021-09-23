import mongoose, { Document, Model, ObjectId } from "mongoose";
import crypto from "crypto";
import moment from "moment-timezone";
import { UserDocument } from "./user.model";

export interface PasswordResetDocument extends Document {
  resetToken: string;
  userId: ObjectId;
  userEmail: string;
  expires: Date;
  generate: (user: UserDocument) => {
    userEmail: string;
    resetToken: string;
};
}
export interface PasswordResetModel extends Model<PasswordResetDocument> {
  generate: (user: UserDocument) => {
    userEmail: string;
    resetToken: string;
};
}
/**
 * Refresh Token Schema
 * @private
 */
const passwordResetTokenSchema = new mongoose.Schema<
  PasswordResetDocument,
  PasswordResetModel
>({
  resetToken: {
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

passwordResetTokenSchema.statics = {
  /**
   * Generate a reset token object and saves it into the database
   *
   * @param {User} user
   * @returns {ResetToken}
   */
  async generate(user:UserDocument) {
    const userId = user._id;
    const userEmail = user.email;
    const resetToken = `${userId}.${crypto.randomBytes(40).toString("hex")}`;
    const expires = moment().add(2, "hours").toDate();
    const ResetTokenObject = new PasswordResetToken({
      resetToken,
      userId,
      userEmail,
      expires,
    });
    await ResetTokenObject.save();
    return ResetTokenObject;
  },
};

/**
 * @typedef RefreshToken
 */
const PasswordResetToken = mongoose.model<
  PasswordResetDocument,
  PasswordResetModel
>("PasswordResetToken", passwordResetTokenSchema);
export default PasswordResetToken;
