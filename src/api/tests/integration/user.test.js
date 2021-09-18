/* eslint-disable arrow-body-style */
/* eslint-disable no-unused-expressions */
import request from 'supertest';
import {
  CREATED,
  CONFLICT,
  BAD_REQUEST,
  FORBIDDEN,
  OK,
  NOT_FOUND,
  NO_CONTENT,
  UNAUTHORIZED,
} from 'http-status';
import { expect } from 'chai';
import { useFakeTimers } from 'sinon';
import { hash } from 'bcryptjs';
import { some, omitBy, isNil } from 'lodash';
import app from '../../../index';
import {
  findOne,
  deleteMany,
  insertMany,
  findAndGenerateToken,
  find,
} from '../../models/user.model';
import { jwtExpirationInterval as JWT_EXPIRATION } from '../../../config/vars';

/**
 * root level hooks
 */

async function format(user) {
  const formated = user;

  // delete password
  delete formated.password;

  // get users from database
  const dbUser = (await findOne({ email: user.email })).transform();

  // remove null and undefined properties
  return omitBy(dbUser, isNil);
}

describe('Users API', async () => {
  let adminAccessToken;
  let userAccessToken;
  let dbUsers;
  let user;
  let admin;

  const password = '123456';
  const passwordHashed = await hash(password, 1);

  beforeEach(async () => {
    dbUsers = {
      branStark: {
        email: 'branstark@gmail.com',
        password: passwordHashed,
        name: 'Bran Stark',
        role: 'admin',
      },
      jonSnow: {
        email: 'jonsnow@gmail.com',
        password: passwordHashed,
        name: 'Jon Snow',
      },
    };

    user = {
      email: 'sousa.dfs@gmail.com',
      password,
      name: 'Daniel Sousa',
    };

    admin = {
      email: 'sousa.dfs@gmail.com',
      password,
      name: 'Daniel Sousa',
      role: 'admin',
    };

    await deleteMany({});
    await insertMany([dbUsers.branStark, dbUsers.jonSnow]);
    dbUsers.branStark.password = password;
    dbUsers.jonSnow.password = password;
    adminAccessToken = (await findAndGenerateToken(dbUsers.branStark))
      .accessToken;
    userAccessToken = (await findAndGenerateToken(dbUsers.jonSnow)).accessToken;
  });

  describe('POST /v1/users', () => {
    it('should create a new user when request is ok', () => {
      return request(app)
        .post('/v1/users')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send(admin)
        .expect(CREATED)
        .then((res) => {
          delete admin.password;
          expect(res.body).to.include(admin);
        });
    });

    it('should create a new user and set default role to "user"', () => {
      return request(app)
        .post('/v1/users')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send(user)
        .expect(CREATED)
        .then((res) => {
          expect(res.body.role).to.be.equal('user');
        });
    });

    it('should report error when email already exists', () => {
      user.email = dbUsers.branStark.email;

      return request(app)
        .post('/v1/users')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send(user)
        .expect(CONFLICT)
        .then((res) => {
          const { field } = res.body.errors[0];
          const { location } = res.body.errors[0];
          const { messages } = res.body.errors[0];
          expect(field).to.be.equal('email');
          expect(location).to.be.equal('body');
          expect(messages).to.include('"email" already exists');
        });
    });

    it('should report error when email is not provided', () => {
      delete user.email;

      return request(app)
        .post('/v1/users')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send(user)
        .expect(BAD_REQUEST)
        .then((res) => {
          const { field } = res.body.errors[0];
          const { location } = res.body.errors[0];
          const { messages } = res.body.errors[0];
          expect(field).to.be.equal('email');
          expect(location).to.be.equal('body');
          expect(messages).to.include('"email" is required');
        });
    });

    it('should report error when password length is less than 6', () => {
      user.password = '12345';

      return request(app)
        .post('/v1/users')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send(user)
        .expect(BAD_REQUEST)
        .then((res) => {
          const { field } = res.body.errors[0];
          const { location } = res.body.errors[0];
          const { messages } = res.body.errors[0];
          expect(field).to.be.equal('password');
          expect(location).to.be.equal('body');
          expect(messages).to.include(
            '"password" length must be at least 6 characters long',
          );
        });
    });

    it('should report error when logged user is not an admin', () => {
      return request(app)
        .post('/v1/users')
        .set('Authorization', `Bearer ${userAccessToken}`)
        .send(user)
        .expect(FORBIDDEN)
        .then((res) => {
          expect(res.body.code).to.be.equal(FORBIDDEN);
          expect(res.body.message).to.be.equal('Forbidden');
        });
    });
  });

  describe('GET /v1/users', () => {
    it('should get all users', () => {
      return request(app)
        .get('/v1/users')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(OK)
        .then(async (res) => {
          const bran = await format(dbUsers.branStark);
          const john = await format(dbUsers.jonSnow);
          // before comparing it is necessary to convert String to Date
          res.body[0].createdAt = new Date(res.body[0].createdAt);
          res.body[1].createdAt = new Date(res.body[1].createdAt);

          const includesBranStark = some(res.body, bran);
          const includesjonSnow = some(res.body, john);

          expect(res.body).to.be.an('array');
          expect(res.body).to.have.lengthOf(2);
          expect(includesBranStark).to.be.true;
          expect(includesjonSnow).to.be.true;
        });
    });

    it('should get all users with pagination', () => {
      return request(app)
        .get('/v1/users')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .query({ page: 2, perPage: 1 })
        .expect(OK)
        .then(async (res) => {
          delete dbUsers.jonSnow.password;

          expect(res.body).to.be.an('array');
          expect(res.body[0]).to.be.an('object');
          expect(res.body).to.have.lengthOf(1);
          expect(res.body[0].name).to.be.equal('Jon Snow');
        });
    });

    it('should filter users', () => {
      return request(app)
        .get('/v1/users')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .query({ email: dbUsers.jonSnow.email })
        .expect(OK)
        .then(async (res) => {
          delete dbUsers.jonSnow.password;
          const john = await format(dbUsers.jonSnow);

          // before comparing it is necessary to convert String to Date
          res.body[0].createdAt = new Date(res.body[0].createdAt);

          const includesjonSnow = some(res.body, john);

          expect(res.body).to.be.an('array');
          expect(res.body).to.have.lengthOf(1);
          expect(includesjonSnow).to.be.true;
        });
    });

    it("should report error when pagination's parameters are not a number", () => {
      return request(app)
        .get('/v1/users')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .query({ page: '?', perPage: 'whaat' })
        .expect(BAD_REQUEST)
        .then((res) => {
          const { field } = res.body.errors[0];
          const { location } = res.body.errors[0];
          const { messages } = res.body.errors[0];
          expect(field).to.be.equal('page');
          expect(location).to.be.equal('query');
          expect(messages).to.include('"page" must be a number');
          return Promise.resolve(res);
        })
        .then((res) => {
          const { field } = res.body.errors[1];
          const { location } = res.body.errors[1];
          const { messages } = res.body.errors[1];
          expect(field).to.be.equal('perPage');
          expect(location).to.be.equal('query');
          expect(messages).to.include('"perPage" must be a number');
        });
    });

    it('should report error if logged user is not an admin', () => {
      return request(app)
        .get('/v1/users')
        .set('Authorization', `Bearer ${userAccessToken}`)
        .expect(FORBIDDEN)
        .then((res) => {
          expect(res.body.code).to.be.equal(FORBIDDEN);
          expect(res.body.message).to.be.equal('Forbidden');
        });
    });
  });

  describe('GET /v1/users/:userId', () => {
    it('should get user', async () => {
      const id = (await findOne({}))._id;
      delete dbUsers.branStark.password;

      return request(app)
        .get(`/v1/users/${id}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(OK)
        .then((res) => {
          expect(res.body).to.include(dbUsers.branStark);
        });
    });

    it('should report error "User does not exist" when user does not exists', () => {
      return request(app)
        .get('/v1/users/56c787ccc67fc16ccc1a5e92')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(NOT_FOUND)
        .then((res) => {
          expect(res.body.code).to.be.equal(404);
          expect(res.body.message).to.be.equal('User does not exist');
        });
    });

    it('should report error "User does not exist" when id is not a valid ObjectID', () => {
      return request(app)
        .get('/v1/users/palmeiras1914')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(NOT_FOUND)
        .then((res) => {
          expect(res.body.code).to.be.equal(404);
          expect(res.body.message).to.equal('User does not exist');
        });
    });

    it('should report error when logged user is not the same as the requested one', async () => {
      const id = (await findOne({ email: dbUsers.branStark.email }))._id;

      return request(app)
        .get(`/v1/users/${id}`)
        .set('Authorization', `Bearer ${userAccessToken}`)
        .expect(FORBIDDEN)
        .then((res) => {
          expect(res.body.code).to.be.equal(FORBIDDEN);
          expect(res.body.message).to.be.equal('Forbidden');
        });
    });
  });

  describe('PUT /v1/users/:userId', () => {
    it('should replace user', async () => {
      delete dbUsers.branStark.password;
      const id = (await findOne(dbUsers.branStark))._id;

      return request(app)
        .put(`/v1/users/${id}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send(user)
        .expect(OK)
        .then((res) => {
          delete user.password;
          expect(res.body).to.include(user);
          expect(res.body.role).to.be.equal('user');
        });
    });

    it('should report error when email is not provided', async () => {
      const id = (await findOne({}))._id;
      delete user.email;

      return request(app)
        .put(`/v1/users/${id}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send(user)
        .expect(BAD_REQUEST)
        .then((res) => {
          const { field } = res.body.errors[0];
          const { location } = res.body.errors[0];
          const { messages } = res.body.errors[0];
          expect(field).to.be.equal('email');
          expect(location).to.be.equal('body');
          expect(messages).to.include('"email" is required');
        });
    });

    it('should report error user when password length is less than 6', async () => {
      const id = (await findOne({}))._id;
      user.password = '12345';

      return request(app)
        .put(`/v1/users/${id}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send(user)
        .expect(BAD_REQUEST)
        .then((res) => {
          const { field } = res.body.errors[0];
          const { location } = res.body.errors[0];
          const { messages } = res.body.errors[0];
          expect(field).to.be.equal('password');
          expect(location).to.be.equal('body');
          expect(messages).to.include(
            '"password" length must be at least 6 characters long',
          );
        });
    });

    it('should report error "User does not exist" when user does not exists', () => {
      return request(app)
        .put('/v1/users/palmeiras1914')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(NOT_FOUND)
        .then((res) => {
          expect(res.body.code).to.be.equal(404);
          expect(res.body.message).to.be.equal('User does not exist');
        });
    });

    it('should report error when logged user is not the same as the requested one', async () => {
      const id = (await findOne({ email: dbUsers.branStark.email }))._id;

      return request(app)
        .put(`/v1/users/${id}`)
        .set('Authorization', `Bearer ${userAccessToken}`)
        .expect(FORBIDDEN)
        .then((res) => {
          expect(res.body.code).to.be.equal(FORBIDDEN);
          expect(res.body.message).to.be.equal('Forbidden');
        });
    });

    it('should not replace the role of the user (not admin)', async () => {
      const id = (await findOne({ email: dbUsers.jonSnow.email }))._id;
      const role = 'admin';

      return request(app)
        .put(`/v1/users/${id}`)
        .set('Authorization', `Bearer ${userAccessToken}`)
        .send(admin)
        .expect(OK)
        .then((res) => {
          expect(res.body.role).to.not.be.equal(role);
        });
    });
  });

  describe('PATCH /v1/users/:userId', () => {
    it('should update user', async () => {
      delete dbUsers.branStark.password;
      const id = (await findOne(dbUsers.branStark))._id;
      const { name } = user;

      return request(app)
        .patch(`/v1/users/${id}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({ name })
        .expect(OK)
        .then((res) => {
          expect(res.body.name).to.be.equal(name);
          expect(res.body.email).to.be.equal(dbUsers.branStark.email);
        });
    });

    it('should not update user when no parameters were given', async () => {
      delete dbUsers.branStark.password;
      const id = (await findOne(dbUsers.branStark))._id;

      return request(app)
        .patch(`/v1/users/${id}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send()
        .expect(OK)
        .then((res) => {
          expect(res.body).to.include(dbUsers.branStark);
        });
    });

    it('should report error "User does not exist" when user does not exists', () => {
      return request(app)
        .patch('/v1/users/palmeiras1914')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(NOT_FOUND)
        .then((res) => {
          expect(res.body.code).to.be.equal(404);
          expect(res.body.message).to.be.equal('User does not exist');
        });
    });

    it('should report error when logged user is not the same as the requested one', async () => {
      const id = (await findOne({ email: dbUsers.branStark.email }))._id;

      return request(app)
        .patch(`/v1/users/${id}`)
        .set('Authorization', `Bearer ${userAccessToken}`)
        .expect(FORBIDDEN)
        .then((res) => {
          expect(res.body.code).to.be.equal(FORBIDDEN);
          expect(res.body.message).to.be.equal('Forbidden');
        });
    });

    it('should not update the role of the user (not admin)', async () => {
      const id = (await findOne({ email: dbUsers.jonSnow.email }))._id;
      const role = 'admin';

      return request(app)
        .patch(`/v1/users/${id}`)
        .set('Authorization', `Bearer ${userAccessToken}`)
        .send({ role })
        .expect(OK)
        .then((res) => {
          expect(res.body.role).to.not.be.equal(role);
        });
    });
  });

  describe('DELETE /v1/users', () => {
    it('should delete user', async () => {
      const id = (await findOne({}))._id;

      return request(app)
        .delete(`/v1/users/${id}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(NO_CONTENT)
        .then(() => request(app).get('/v1/users'))
        .then(async () => {
          const users = await find({});
          expect(users).to.have.lengthOf(1);
        });
    });

    it('should report error "User does not exist" when user does not exists', () => {
      return request(app)
        .delete('/v1/users/palmeiras1914')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(NOT_FOUND)
        .then((res) => {
          expect(res.body.code).to.be.equal(404);
          expect(res.body.message).to.be.equal('User does not exist');
        });
    });

    it('should report error when logged user is not the same as the requested one', async () => {
      const id = (await findOne({ email: dbUsers.branStark.email }))._id;

      return request(app)
        .delete(`/v1/users/${id}`)
        .set('Authorization', `Bearer ${userAccessToken}`)
        .expect(FORBIDDEN)
        .then((res) => {
          expect(res.body.code).to.be.equal(FORBIDDEN);
          expect(res.body.message).to.be.equal('Forbidden');
        });
    });
  });

  describe('GET /v1/users/profile', () => {
    it("should get the logged user's info", () => {
      delete dbUsers.jonSnow.password;

      return request(app)
        .get('/v1/users/profile')
        .set('Authorization', `Bearer ${userAccessToken}`)
        .expect(OK)
        .then((res) => {
          expect(res.body).to.include(dbUsers.jonSnow);
        });
    });

    it('should report error without stacktrace when accessToken is expired', async () => {
      // fake time
      const clock = useFakeTimers();
      const expiredAccessToken = (await findAndGenerateToken(dbUsers.branStark))
        .accessToken;

      // move clock forward by minutes set in config + 1 minute
      clock.tick(JWT_EXPIRATION * 60000 + 60000);

      return request(app)
        .get('/v1/users/profile')
        .set('Authorization', `Bearer ${expiredAccessToken}`)
        .expect(UNAUTHORIZED)
        .then((res) => {
          expect(res.body.code).to.be.equal(UNAUTHORIZED);
          expect(res.body.message).to.be.equal('jwt expired');
          expect(res.body).to.not.have.a.property('stack');
        });
    });
  });
});
