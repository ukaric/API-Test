const app = require('../app');

const api = require('supertest')(app);
const chai = require('chai');
const like = require('chai-like');
const something = require('chai-things');
chai.should();
const expect = chai.expect;
chai.use(something);

//Regex extension for 'chai-like'
const regMatcher = like.extend({
  match: function(object, expected) {
    return typeof object === 'string' && expected instanceof RegExp;
  },
  assert: function(object, expected) {
    return expected.test(object);
  }
});

like.extend(regMatcher);
chai.use(like);

let users = [];
let usersID = [];
let data = null;
let login = null;
let auth = null;
let userTest = null; // This one is for when you want same userID across whole test suite

// Helper function to simulate random user id
const randomID = arr => arr[Math.floor(Math.random() * arr.length)];

describe('Tests with auth', () => {
  //Initial getter for credentials so we can populate global scope
  before('Get credentials', done => {
    api
      .post('/sign-in')
      // Sets the header
      .set('Content-Type', 'application/json')
      .send({
        //This could be improved by regex also
        password: 'password',
        email: 'email'
      })
      .expect(200)
      .then(res => {
        data = res.body;
        //Checks the header for access_token
        data.should.have
          .property('access_token')
          //Matches token format provided in app.js
          .and.to.match(/\d{8}-\d{4}-\d{4}-\d{4}-\d{12}/);
        login = res.body.access_token;
        done();
      })
      .catch(done);
  });
  //Initial call to users so we can pre-fetch users and isolate ID's
  before('Prefetch users', done => {
    api
      .get('/users')
      .set('authorization', login)
      .then(res => {
        auth = res.request.header.authorization;
        expect(auth).to.equal(login);
        data = res.body;
        users = [...data];
        //Gets users_id key from array of user objects
        //This way we assure no matter what format the id is we will always test accordingly
        const usersId = users.map(user => {
          return user.user_id;
        });
        usersID = [...usersId];
        //Now userID is identical across the whole test suite
        userTest = randomID(usersID);
        //Checks if response is actually an array that has structure that we need
        expect(users).to.be.an('array');
        // Checks all the items of res for required keys
        users.should.all.have.property('user_id');
        users.should.all.have.property('name');
        users.should.all.have.property('title');
        users.should.all.have.property('active');
        expect(users.length).to.be.equal(6);
        done();
      })
      .catch(done);
  });
  // Login user to the system and fetch access token
  it(`It responds with 'Hello World!'`, done => {
    api.get('/').expect(200).expect('Hello World!').end(done);
  });
  // Tests random route for 404 since there are no redirects its simple
  it('Tests random route', done => {
    api.get('/random123').expect(404).end(done);
  });
  // Tests login endpoint
  it('Login user', done => {
    api
      .post('/sign-in')
      // Sets the header
      .set('Content-Type', 'application/json')
      .send({
        //This could be improved by regex also
        password: 'password',
        email: 'email'
      })
      .expect(200)
      .then(res => {
        data = res.body;
        //Checks the header for access_token
        data.should.have
          .property('access_token')
          //Matches token format provided in app.js
          .and.to.match(/\d{8}-\d{4}-\d{4}-\d{4}-\d{12}/);
        done();
      })
      .catch(done);
  });

  // Get a list of all users
  it('Get users list', done => {
    api
      .get('/users')
      .set('authorization', login)
      .then(res => {
        auth = res.request.header.authorization;
        expect(auth).to.equal(login);
        data = res.body;
        users = [...data];
        //Gets users_id key from array of user objects
        const usersId = users.map(user => {
          return user.user_id;
        });
        usersID = [...usersId];
        //Checks if response is actually an array that has structure that we need
        expect(users).to.be.an('array');
        // Checks all the items of res for required keys
        users.should.all.have.property('user_id');
        users.should.all.have.property('name');
        users.should.all.have.property('title');
        users.should.all.have.property('active');
        expect(users.length).to.be.equal(6);
        done();
      })
      .catch(done);
  });
  it('Gets single user', done => {
    api
      .get(`/users/${userTest}`)
      //Sets header
      .set('authorization', login)
      //Expects status code to be == 200
      .expect(200)
      .then(res => {
        auth = res.request.header.authorization;
        expect(auth).to.equal(login);
        data = res.body;
        //If there is nor error key in body
        if (!data.error) {
          //Checks if data exists, additional layer
          expect(data).to.exist;
          //Checks if object has required properties
          expect(data).to.have.property('user_id');
          expect(data).to.have.property('title');
          expect(data).to.have.property('active');
          data.should.like({
            // Checks if called id matches id from object
            user_id: userTest,
            // Simple checks since we dont have real database this would be a must
            name: /.{3,256}/,
            title: /.{3,256}/,
            active: true || false
          });
        } else {
          expect(data).to.have.property('error');
          expect(data).to.have.property('message');
          expect(data).to.have.property('stack');
        }
        done();
      })
      .catch(done);
  });
  it('Gets user accounts', done => {
    api
      .get(`/users/${userTest}/accounts`)
      .set('authorization', login)
      .expect(200)
      .then(res => {
        auth = res.request.header.authorization;
        expect(auth).to.equal(login);
        data = res.body;

        // Checks if users are timelords
        if (userTest === 5 || userTest === 6) {
          //Checks for specific error message object
          expect(data).to.have.property('error').and.to.equal(true);
          expect(data).to.have
            .property('message')
            .and.to.equal(`Time lords do not have accounts`);
          expect(data).to.have.property('stack');
        } else if (data.length > 1) {
          data.should.all.have.property('account_id');
          data.should.all.have.property('name');
          data.should.all.have.property('active');
          data.should.have.all.property('money');
        } else if (data.length === 1) {
          data.should.contain.a.thing.with.property('account_id');
          data.should.contain.a.thing.with.property('name');
          data.should.contain.a.thing.with.property('active');
          data.should.contain.a.thing.with.property('money');
        }
        if (data.error && data.message === 'User is not active') {
          expect(data).to.have
            .property('message')
            .and.to.equal(`User is not active`);
          expect(data).to.have.property('stack');
        }

        done();
      })
      .catch(done);
  });
});

describe('Tests with no auth', () => {
  it('Should throw to fetch users and error out', done => {
    api
      .get('/users')
      .set('authorization', null)
      .then(res => {
        data = res.body;
        expect(data).to.have.property('error');
        expect(data).to.have.property('message');
        expect(data).to.have.property('stack');
        done();
      })
      .catch(done);
  });
  it('Should try to fetch user and error out', done => {
    api
      .get(`/users/${randomID(usersID)}`)
      .set('authorization', null)
      .then(res => {
        data = res.body;
        expect(data).to.have.property('error');
        expect(data).to.have.property('message');
        expect(data).to.have.property('stack');
        done();
      })
      .catch(done);
  });
  it('Should try to fetch accounts and error out', done => {
    api
      .get(`/users/${randomID(usersID)}/accounts`)
      .set('authorization', null)
      .then(res => {
        data = res.body;
        expect(data).to.have.property('error');
        expect(data).to.have.property('message');
        expect(data).to.have.property('stack');
        done();
      })
      .catch(done);
  });
});

describe('Special error case', () => {
  beforeEach('Get credentials', done => {
    api
      .post('/sign-in')
      // Sets the header
      .set('Content-Type', 'application/json')
      .send({
        //This could be improved by regex also
        password: 'password',
        email: 'email'
      })
      .expect(200)
      .then(res => {
        data = res.body;
        //Checks the header for access_token
        data.should.have
          .property('access_token')
          //Matches token format provided in app.js
          .and.to.match(/\d{8}-\d{4}-\d{4}-\d{4}-\d{12}/);
        login = res.body.access_token;
        done();
      })
      .catch(done);
  });
  before('Prefetch users', done => {
    api
      .get('/users')
      .set('authorization', login)
      .then(res => {
        auth = res.request.header.authorization;
        expect(auth).to.equal(login);
        data = res.body;
        users = [...data];
        //Gets users_id key from array of user objects
        //This way we assure no matter what format the id is we will always test accordingly

        // Here since this is special test case i filtered out only inactive users.
        const inactiveUsers = users
          .filter(user => {
            return user.active === false;
          })
          .map(user => {
            return user.user_id;
          });
        //Now userID is identical across the whole test suite
        userTest = randomID(inactiveUsers);
        //Checks if response is actually an array that has structure that we need
        expect(users).to.be.an('array');
        // Checks all the items of res for required keys
        users.should.all.have.property('user_id');
        users.should.all.have.property('name');
        users.should.all.have.property('title');
        users.should.all.have.property('active');
        expect(users.length).to.be.equal(6);
        done();
      })
      .catch(done);
  });
  it('Checks for special case where user is not ACTIVE', done => {
    // This is probably the bug instead of .active in app.js it was status
    // I took liberty and altered it to userToReturn[0].active === false so it evaluates properly
    // Without that check it would never evaluate
    // But i have also included check here if userToReturn[0].status === false
    api
      .get(`/users/${userTest}`)
      //Sets header
      .set('authorization', login)
      //Expects status code to be == 200
      .expect(200)
      .then(res => {
        auth = res.request.header.authorization;
        //Check the auth
        expect(auth).to.equal(login);
        data = res.body;
        //This checks if data object has status key with value 'false'
        //This is never going to be true with current data so this test would always be bad
        // This brings me back to first point i think that there is bug in app.js itself.

        // And this evaluation would actually never pass because error is thrown if status === false
        if (!data.error) {
          // And since the userID's are setup to always pick the id's of users that are inactive
          // we will never go to this branch
          expect(data).to.have.property('status').to.equal('false');
        } else {
          // This is standard check for error object
          expect(data).to.have.property('error');
          expect(data).to.have.property('message');
          expect(data).to.have.property('stack');
        }
        done();
      })
      .catch(done);
  });
});
