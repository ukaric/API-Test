const express = require('express')
const bodyParser = require('body-parser')

const app = express()

app.use(bodyParser.json()) // to support JSON-encoded bodies
app.use(
  bodyParser.urlencoded({
    // to support URL-encoded bodies
    extended: true,
  }),
)

function errorResponse(error) {
  return {
    error: true,
    message: error.message,
    stack: error.stack,
  }
}

const users = [
  {
    user_id: 1,
    name: 'User The One',
    title: 'Pljeskavica master',
    active: true,
  },
  {
    user_id: 2,
    name: 'User The Two',
    title: 'Rakija master',
    active: true,
  },
  {
    user_id: 3,
    name: 'User The Three',
    title: 'Salata master',
    active: false,
  },
  {
    user_id: 4,
    name: 'User The Four',
    title: 'Drugstore master',
    active: false,
  },
  {
    user_id: 5,
    name: 'The Master',
    title: 'Evil timelord',
    active: true,
  },
  {
    user_id: 6,
    name: 'The Doctor',
    title: 'Good timelord',
    active: true,
  },
]

const accounts = [
  [
    {
      account_id: 1,
      name: `Wife's account`,
      active: true,
      money: 100,
    },
  ],
  [
    {
      account_id: 2,
      name: `Cat's account`,
      active: true,
      money: 150,
    },
    {
      account_id: 3,
      name: `Dog's account`,
      active: false,
      money: 100,
    },
  ],
  [
    {
      account_id: 1,
      name: `My account`,
      active: true,
      money: 200,
    },
  ],
  [
    {
      account_id: 1,
      name: `Savings account`,
      active: true,
      money: 300,
    },
  ],
]

const accessToken = '00000000-0000-0000-0000-000000000000'
app.get('/', function(req, res) {
  res.send('Hello World!')
})

const port = process.env.PORT || 3000

app.listen(port, function() {
  console.log(`Example app listening on port ${port}!`)
})

// Sign in to get token
app.post('/sign-in', (req, res) => {
  try {
    if (req.body.password === 'password' && req.body.email) {
      res.send({
        access_token: accessToken,
      })
    } else {
      throw new Error('Wrong password or email')
    }
  } catch (error) {
    res.send(errorResponse(error))
  }
})

// Get all users
app.get('/users', (req, res) => {
  try {
    if (req.headers.authorization !== accessToken) {
      throw new Error('Missing authorization token')
    }
    res.send(users)
  } catch (error) {
    res.send(errorResponse(error))
  }
})

// get single user
app.get('/users/:userId', (req, res) => {
  try {
    if (req.headers.authorization !== accessToken) {
      throw new Error('Missing authorization token')
    }

    const userToReturn = users.filter(user => {
      return user.user_id == req.params.userId
    })
    // I guess this should check for active rather than status :)
    // This would never evaluate to true if .status was left
    if (userToReturn[0].active === false) {
      throw new Error('User is not active')
    }

    res.send(userToReturn[0])
  } catch (error) {
    res.send(errorResponse(error))
  }
})

// get single user accounts
app.get('/users/:userId/accounts', (req, res) => {
  try {
    if (req.headers.authorization !== accessToken) {
      throw new Error('Missing authorization token')
    }

    const userToReturn = users.filter(user => {
      return user.user_id == req.params.userId
    })
    // This would be bug
    if (userToReturn[0].active === false) {
      throw new Error('User is not active')
    }

    if (req.params.userId == 5 || req.params.userId == 6) {
      throw new Error('Time lords do not have accounts')
    }

    const accountId = req.params.userId - 1

    res.send(accounts[accountId] ? accounts[accountId] : [])
  } catch (error) {
    res.send(errorResponse(error))
  }
})

module.exports = app
