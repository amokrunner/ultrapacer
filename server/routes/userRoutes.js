// userRoutes.js
const express = require('express')
const userRoutes = express.Router()
const User = require('../models/User')
const Course = require('../models/Course')
const Plan = require('../models/Plan')

// GET
userRoutes.route('/').get(async function (req, res) {
  try {
    let user = await User.findOneAndUpdate(
      { auth0ID: req.user.sub },
      { last_login: new Date() }
    ).exec()
    if (user == null) {
      user = new User({
        auth0ID: req.user.sub
      })
      await user.save()
    }
    res.json(user)
  } catch (err) {
    console.log(err)
    res.status(400).send(err)
  }
})

// GET STATS
userRoutes.route('/stats').get(async function (req, res) {
  try {
    const user = await User.findOne({ auth0ID: req.user.sub }).exec()
    const q = {
      $or: [
        {
          _user: user
        },
        {
          $and: [
            {
              _id: {
                $in: user._courses
              }
            },
            {
              public: true
            }
          ]
        }
      ]
    }
    const courseCount = await Course.countDocuments(q).exec()
    const planCount = await Plan.countDocuments({ _user: user }).exec()
    res.json({
      courses: courseCount,
      plans: planCount
    })
  } catch (err) {
    console.log(err)
    res.status(400).send(err)
  }
})

// UPDATE
userRoutes.route('/:id').put(async function (req, res) {
  try {
    const user = await User.findOne({ auth0ID: req.user.sub }).exec()
    const fields = ['distUnits', 'elevUnits', 'altModel', 'email', 'membership']
    fields.forEach((f) => {
      if (req.body[f] !== undefined) {
        user[f] = req.body[f]
      }
    })
    await user.save()
    res.json('Update complete')
  } catch (err) {
    console.log(err)
    res.status(400).send(err)
  }
})

module.exports = userRoutes
