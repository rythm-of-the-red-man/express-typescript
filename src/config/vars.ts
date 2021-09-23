import path from "path";
import {config} from "dotenv-safe"
// import .env variables
config(
  {
    path: path.join(__dirname, "../../.env"),
    sample: path.join(__dirname, "../../.env.example"),
  }
)

export const env = process.env.NODE_ENV;
export const port = process.env.PORT;
export const jwtSecret = process.env.JWT_SECRET || '';
export const jwtExpirationInterval = process.env.JWT_EXPIRATION_MINUTES;
export const mongo = {
  uri:
    process.env.NODE_ENV === "test"
      ? process.env.MONGO_URI_TESTS
      : process.env.MONGO_URI,
};
export const logs = process.env.NODE_ENV === "production" ? "combined" : "dev";
export const emailConfig = {
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  username: process.env.EMAIL_USERNAME,
  password: process.env.EMAIL_PASSWORD,
};
