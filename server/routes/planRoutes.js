// planRoutes.js
var express = require('express')
var planRoutes = express.Router()
var User = require('../models/User')
var Plan = require('../models/Plan')
var Course = require('../models/Course')

// GET LIST
planRoutes.route('/list/:courseID').get(async function (req, res) {
  try {
    var user = await User.findOne({ auth0ID: req.user.sub }).exec()
    var course = await Course.findById(req.params.courseID).exec()
    if (course._user.equals(user._id) || course.public) {
      var plans = await Plan.find({ _course: req.params.courseID }).sort('name').exec()
      res.json(plans)
    } else {
      res.status(403).send('No permission')
    }
  } catch (err) {
    console.log(err)
    res.status(400).send(err)
  }
})

// SAVE NEW
planRoutes.route('/').post(async function (req, res) {
  try {
    var plan = new Plan(req.body)
    plan._user = await User.findOne({ auth0ID: req.user.sub }).exec()
    await plan.save()
    res.json('Update complete')
  } catch (err) {
    console.log(err)
    res.status(400).send(err)
  }
})

// DELETE
planRoutes.route('/:id').delete(async function (req, res) {
  try {
    var user = await User.findOne({ auth0ID: req.user.sub }).exec()
    var plan = await Plan.findById(req.params.id).populate('_course').exec()
    if (plan._course._user.equals(user._id)) {
      await plan.remove()
      res.json('Successfully removed')
    } else {
      res.status(403).send('No permission')
    }
  } catch (err) {
    console.log(err)
    res.status(400).send(err)
  }
})

module.exports = planRoutes