import {UserDocument} from './models/user.model'
declare global {
  namespace Express {
    interface User extends UserDocument {}
    interface Request {
      locals: {
        user: User;
      };
    }
  }
}