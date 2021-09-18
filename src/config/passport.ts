import {Strategy as JwtStrategy, VerifiedCallback} from 'passport-jwt';
import BearerStrategy from 'passport-http-bearer';
import { ExtractJwt } from 'passport-jwt';
import { jwtSecret } from './vars';
import authProviders from '../api/services/authProviders';
import User, { Services } from '../api/models/user.model';

const jwtOptions = {
  secretOrKey: jwtSecret,
  jwtFromRequest: ExtractJwt.fromAuthHeaderWithScheme('Bearer'),
};
type payload = {
  sub:string;
}
const jwt = async (payload:payload, done:VerifiedCallback) => {
  try {
    const user = await User.findById(payload.sub);
    if (user) return done(null, user);
    return done(null, false);
  } catch (error) {
    return done(error, false);
  }
};


const oAuth = (service: Services) => async (token:string, done:VerifiedCallback) => {
  try {
    const userData = await authProviders[service](token);
    const user = await User.oAuthLogin(userData.service, userData.id, userData.email, userData.name, userData.picture);
    return done(null, user);
  } catch (err) {
    return done(err);
  }
};
const strategies = {
  jwt: new JwtStrategy(jwtOptions, jwt),
  //@ts-ignore
  facebook: new BearerStrategy(oAuth(Services.facebook)),
  //@ts-ignore
  google: new BearerStrategy(oAuth(Services.google)),
}

export default strategies