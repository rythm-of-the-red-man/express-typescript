// make bluebird default Promise
Promise = require('bluebird'); // eslint-disable-line no-global-assign
import { port, env } from './config/vars';
import logger from './config/logger';
import app from './config/express';
import mongoose from './config/mongoose';

// open mongoose connection
mongoose.connect();

// listen to requests
app.listen(port, () => logger.info(`server started on port ${port} (${env})`));

/**
* Exports express
* @public
*/
module.exports = app;
