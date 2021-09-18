import mongoose from "mongoose";
import logger from "./logger";
import { mongo, env } from "./vars";

// set mongoose Promise to Bluebird
mongoose.Promise = Promise;

// Exit application on error
mongoose.connection.on("error", (err: string) => {
  logger.error(`MongoDB connection error: ${err}`);
  process.exit(-1);
});

// print mongoose logs in dev env
if (env === "development") {
  mongoose.set("debug", true);
}

const connection = {
  connect: () => {
    mongoose
      .connect(mongo.uri || '', {
        useCreateIndex: true,
        keepAlive: true,
        useNewUrlParser: true,
        useUnifiedTopology: true,
        useFindAndModify: false,
      })
      .then(() => console.log("mongoDB connected..."));
    return mongoose.connection;
  },
};
export default connection;
