const app = require('../app')

const api = require('supertest')(app)
const chai = require('chai')
const like = require('chai-like')
const something = require('chai-things')
chai.should()
const expect = chai.expect
chai.use(something)

//Regex extension for 'chai-like'
const regMatcher = like.extend({
  match: function(object, expected) {
    return typeof object === 'string' && expected instanceof RegExp
  },
  assert: function(object, expected) {
    return expected.test(object)
  },
})

like.extend(regMatcher)
chai.use(like)

let login = null
let users = null
let data = null

// Helper function to simulate random user id
function random(min, max) {
  min = Math.ceil(min)
  max = Math.floor(max)
  return Math.floor(Math.random() * (max - min) + min)
}

describe('Tests with auth', () => {
  // Login user to the system and fetch access token
  it(`It responds with 'Hello World!'`, done => {
    api.get('/').expect(200).expect('Hello World!').end(done)
  })
  // Tests random route for 404 since there are no redirects its simple
  it('Tests random route', done => {
    api.get('/random123').expect(404).end(done)
  })
  // Tests login endpoint
  it('Login user', done => {
    api
      .post('/sign-in')
      // Sets the header
      .set('Content-Type', 'application/json')
      .send({
        //This could be improved by regex also
        password: 'password',
        email: 'email',
      })
      .then(res => {
        data = res.body
        //Checks the header for access_token
        data.should.have
          .property('access_token')
          //Matches token format provided in app.js
          .and.to.match(/\d{8}-\d{4}-\d{4}-\d{4}-\d{12}/)
        login = res.body.access_token
        done()
      })
      .catch(done)
  })

  // Get a list of all users
  it('Get users list', done => {
    api
      .get('/users')
      .set('authorization', login)
      .then(res => {
        data = res.body
        //Checks if response is actually an array that has structure that we need
        expect(data).to.be.an('array')
        // Checks all the items of res for required keys
        data.should.all.have.property('user_id')
        data.should.all.have.property('name')
        data.should.all.have.property('title')
        data.should.all.have.property('active')
        expect(data.length).to.be.equal(6)
        done()
      })
      .catch(done)
  })
  it('Gets single user', done => {
    //Randomizes user slug
    let user = random(1, 7)
    api
      .get(`/users/${user}`)
      //Sets header
      .set('authorization', login)
      //Expects status code to be == 200
      .expect(200)
      .then(res => {
        data = res.body
        //If there is nor error key in body
        if (!data.error) {
          //Checks if data exists, additional layer
          expect(data).to.exist
          //Checks if object has required properties
          expect(data).to.have.property('user_id')
          expect(data).to.have.property('title')
          expect(data).to.have.property('active')
          data.should.like({
            // Checks if called id matches id from object
            user_id: user,
            // Simple checks since we dont have real database this would be a must
            name: /.{3,256}/,
            title: /.{3,256}/,
            active: true || false,
          })
        } else {
          expect(data).to.have.property('error')
          expect(data).to.have.property('message')
          expect(data).to.have.property('stack')
        }
        done()
      })
      .catch(done)
  })
  it('Gets user accounts', done => {
    const user = random(1, 6)
    api
      .get(`/users/${user}/accounts`)
      .set('authorization', login)
      .expect(200)
      .then(res => {
        data = res.body

        if (data.error && data.message === 'User is not active') {
          expect(data).to.have
            .property('message')
            .and.to.equal(`User is not active`)
          expect(data).to.have.property('stack')
        }
        // Checks if users are timelords
        if (user === 5 || user === 6) {
          //Checks for specific error message object
          expect(data).to.have.property('error').and.to.equal(true)
          expect(data).to.have
            .property('message')
            .and.to.equal(`Time lords do not have accounts`)
          expect(data).to.have.property('stack')
        }
        if (data.length > 1) {
          expect(data).to.be.an('array')
        }
        done()
      })
      .catch(done)
  })
})

describe('Tests with no auth', () => {
  it('Should throw to fetch users and error out', done => {
    api
      .get('/users')
      .set('authorization', null)
      .then(res => {
        data = res.body
        expect(data).to.have.property('error')
        expect(data).to.have.property('message')
        expect(data).to.have.property('stack')
        done()
      })
      .catch(done)
  })
  it('Should try to fetch user and error out', done => {
    api
      .get(`/users/${random(1, 6)}`)
      .set('authorization', null)
      .then(res => {
        data = res.body
        expect(data).to.have.property('error')
        expect(data).to.have.property('message')
        expect(data).to.have.property('stack')
        done()
      })
      .catch(done)
  })
  it('Should try to fetch accounts and error out', done => {
    api
      .get(`/users/${random(1, 6)}/accounts`)
      .set('authorization', null)
      .then(res => {
        data = res.body
        expect(data).to.have.property('error')
        expect(data).to.have.property('message')
        expect(data).to.have.property('stack')
        done()
      })
      .catch(done)
  })
})
