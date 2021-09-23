/* eslint-disable camelcase */
import axios from 'axios';
import { Services } from '../models/user.model';

const facebook = async (access_token:string):Promise<{
  service: Services;
  picture:string;
  id:string;
  name:string;
  email:string;
}> => {
  const fields = 'id, name, email, picture';
  const url = 'https://graph.facebook.com/me';
  const params = { access_token, fields };
  const response = await axios.get(url, { params });
  const {
    id, name, email, picture,
  } = response.data;
  return {
    service: Services.facebook,
    picture: picture.data.url,
    id,
    name,
    email,
  };
};

const google = async (access_token:string):Promise<{
  service: Services;
  picture:string;
  id:string;
  name:string;
  email:string;
}> => {
  const url = 'https://www.googleapis.com/oauth2/v3/userinfo';
  const params = { access_token };
  const response = await axios.get(url, { params });
  const {
    sub, name, email, picture,
  } = response.data;
  return {
    service: Services.google,
    picture,
    id: sub,
    name,
    email,
  };
};

export default {
  facebook,
  google
}