<template>
  <div class="container-fluid mt-4">
    <b-row>
      <b-col
        class="d-none d-md-block"
        md="12"
        lg="6"
      >
        <h2
          style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;"
        >
          {{ course.name }}
        </h2>
      </b-col>
      <b-col
        v-if="!initializing"
        cols="12"
        lg="6"
        data-nosnippet
      >
        <b-row no-gutters>
          <b-col
            v-if="plansSelect.length"
            cols="7"
            sm="9"
            md="7"
            style="text-align:right"
          >
            <b-form-group
              label="Plan"
              label-cols="3"
              label-cols-lg="2"
            >
              <b-form-select
                v-model="plan"
                type="number"
                :options="plansSelect"
                @change="calcPlan"
              />
            </b-form-group>
          </b-col>
          <b-col
            :cols="plansSelect.length ? '3': '10'"
            :sm="plansSelect.length ? '2': '11'"
            :md="plansSelect.length ? '2': '9'"
            class="pl-2"
          >
            <b-button
              v-if="plansSelect.length && planOwner"
              v-b-popover.hover.blur.bottomright.d250.v-info="
                'Edit the selected pacing plan.'
              "

              @click="editPlan()"
            >
              <v-icon name="edit" />
            </b-button>
            <b-button
              v-b-popover.hover.blur.bottomright.d250.v-info="
                'Create a new pacing plan for this course.'
              "
              variant="success"
              class="mr-n2"
              @click.prevent="newPlan()"
            >
              <v-icon name="plus" />
              <span v-if="!plansSelect.length">New Pacing Plan</span>
            </b-button>
          </b-col>
          <b-col
            cols="2"
            sm="1"
            md="3"
            style="text-align:right"
          >
            <b-dropdown
              right
              variant="primary"
            >
              <template #button-content>
                <span class="d-none d-md-inline">
                  Options
                </span>
              </template>
              <b-dropdown-item
                @click="$refs.courseShare.init()"
              >
                <v-icon name="share-alt" />  Share this Course
              </b-dropdown-item>
              <b-dropdown-item
                v-if="planAssigned && plan._id"
                @click="$refs.courseShare.init('plan')"
              >
                <v-icon name="share-alt" />  Share this Plan
              </b-dropdown-item>
              <b-dropdown-item
                v-if="owner"
                @click="editCourse()"
              >
                <v-icon name="edit" />  Modify Course
              </b-dropdown-item>
              <b-dropdown-item
                v-if="!owner"
                @click="emailOwner"
              >
                <v-icon name="envelope" />  Email {{ course.link ? 'Race' : 'Course' }} Owner
              </b-dropdown-item>
              <b-dropdown-item @click="download()">
                <v-icon name="download" />
                Download GPX/TCX Files
              </b-dropdown-item>
              <b-dropdown-item
                v-if="planAssigned"
                @click="loadCompare()"
              >
                <v-icon name="running" />
                Compare to Activity
              </b-dropdown-item>
              <b-dropdown-item
                @click="print(tableTabNames[tableTabIndex])"
              >
                <v-icon name="print" />
                Print {{ tableTabNames[tableTabIndex] }}{{ tableTabIndex === 3 ? ' Page' : ' Table' }}
              </b-dropdown-item>
              <b-dropdown-item
                @click="print('Profile')"
              >
                <v-icon name="print" />
                Print Profile Chart
              </b-dropdown-item>
            </b-dropdown>
          </b-col>
        </b-row>
      </b-col>
    </b-row>
    <div
      v-if="initializing"
      class="d-flex justify-content-center mb-3"
      data-nosnippet
    >
      <span v-if="course.description">
        {{ course.description }}
      </span>
      <span v-else-if="course.name">
        The {{ course.name }} course covers <b>{{ $units.distf(course.distance, 1) }} {{ $units.dist }}</b> with <b>{{ $units.altf(course.gain, 0) | commas }} {{ $units.alt }}</b> of climbing.
      </span>
    </div>
    <b-row
      v-if="!initializing"
      data-nosnippet
    >
      <b-col
        order="2"
        lg="6"
        xl="7"
      >
        <b-tabs
          ref="tables"
          v-model="tableTabIndex"
          content-class="mt-1"
        >
          <b-tab
            title="Segments"
            active
          >
            <segment-table
              v-if="segments.length"
              ref="segmentTable"
              :course="course"
              :segments="segments"
              :plan="plan"
              :busy="busy"
              :mode="'segments'"
              :show-actual="comparing"
              :table-height="printing==='Segments' ? 0 : tableHeight"
              :visible="tableTabIndex===0"
              :printing="printing==='Segments'"
              :class="printing==='Segments' ? 'pr-2' : ''"
              @select="updateFocus"
              @show="waypointShow"
              @hide="waypointHide"
            />
          </b-tab>
          <b-tab title="Splits">
            <segment-table
              v-if="splits.length"
              ref="splitTable"
              :course="course"
              :segments="splits"
              :plan="plan"
              :busy="busy"
              :mode="'splits'"
              :show-actual="comparing"
              :table-height="printing==='Splits' ? 0 : tableHeight"
              :class="printing==='Splits' ? 'pr-2' : ''"
              :visible="tableTabIndex===1"
              :printing="printing==='Splits'"
              @select="updateFocus"
            />
          </b-tab>
          <b-tab title="Waypoints">
            <waypoint-table
              ref="waypointTable"
              :course="course"
              :segments="planAssigned && pacingSplitsReady ? plan.splits.segments : course.splits.segments"
              :editing="editing"
              :edit-fn="editWaypoint"
              :del-fn="deleteWaypoint"
              :table-height="tableHeight && printing !== 'Waypoints' ? tableHeight - (owner ? 42 : 0) : 0"
              :printing="printing==='Waypoints'"
              :class="printing==='Waypoints' ? 'pr-2' : ''"
              @updateWaypointLocation="updateWaypointLocation"
            />
            <b-row
              v-if="owner"
              class="m-1"
            >
              <div style="flex: 1 1 auto">
                <b-button
                  v-if="editing"
                  variant="success"
                  @click.prevent="newWaypoint()"
                >
                  <v-icon name="plus" /><span>New Waypoint</span>
                </b-button>
              </div>
              <b-button
                :variant="editing ? 'outline-primary' : 'secondary'"
                @click.prevent="editing=!editing"
              >
                <v-icon :name="editing ? 'edit' : 'lock'" />
                <span>editing: {{ editing ? 'on' : 'off' }}</span>
              </b-button>
            </b-row>
          </b-tab>
          <b-tab
            v-if="course.splits.kilometers"
            title="Details"
            :style="tableHeight ? {maxHeight: tableHeight + 'px', overflowY: 'auto'} : {}"
          >
            <plan-details
              ref="planDetails"
              :course="course"
              :points="points"
              :terrain-factors="terrainFactors"
              :event="event"
              :plan="plan"
              :busy="initializing"
              :visible="tableTabIndex===3"
            />
          </b-tab>
        </b-tabs>
      </b-col>
      <b-col
        v-if="points.length"
        lg="6"
        xl="5"
        order="1"
        class="chart-map-container"
      >
        <course-profile
          v-if="points.length"
          ref="profile"
          :printing="printing==='Profile'"
          :course="course"
          :waypoints="course.waypoints.filter(wp=>waypointShowMode(wp))"
          :points="points"
          :sun-events="plan.pacing ? plan.pacing.sunEventsByLoc: []"
          :show-actual="comparing"
          :focus="focus"
          @waypointClick="waypointClick"
        />
        <course-map
          v-if="points.length"
          ref="map"
          :course="course"
          :waypoints="course.waypoints.filter(wp=>waypointShowMode(wp))"
          :points="points"
          :focus="focus"
        />
      </b-col>
    </b-row>
    <course-edit
      v-if="owner"
      ref="courseEdit"
      @refresh="reloadCourse"
      @delete="deleteCourse"
    />
    <plan-edit
      ref="planEdit"
      :course="course"
      :event="event"
      @refresh="refreshPlans"
      @delete="deletePlan"
    />
    <waypoint-edit
      v-if="owner && editing"
      ref="wpEdit"
      :course="course"
      :points="points"
      :terrain-factors="terrainFactors"
      @refresh="refreshWaypoints"
      @delete="deleteWaypoint"
      @setUpdateFlag="setUpdateFlag"
    />
    <delete-modal
      ref="delModal"
    />
    <download-track
      v-if="points.length"
      ref="download"
      :course="course"
      :plan="plan"
      :event="event"
      :points="points"
      :segments="course.splits.segments"
      :update-fn="updatePacing"
    />
    <course-compare
      v-if="planAssigned"
      ref="courseCompare"
      :comparing="comparing"
      @stop="stopCompare"
    />
    <course-share
      ref="courseShare"
      :course="course"
      :plan="plan"
      @setPublic="course.public=true"
    />
    <email-user
      v-if="$user.isAuthenticated && points.length"
      ref="emailOwner"
      :user-id="course._user"
      type="course"
      :subject="course.name"
      :url="url"
    />
    <vue-headful
      v-if="course.name"
      :description="description"
      :title="title"
    />
    <b-toast
      ref="toast-welcome"
      title="Welcome to ultraPacer!"
      toaster="b-toaster-bottom-right"
      solid
      variant="info"
      auto-hide-delay="10000"
    >
      ultraPacer is a web app for creating courses and pacing plans for ultramarathons and trail adventures that factor in grade, terrain, altitude, heat, nighttime, and fatigue. To create a pace plan for this course, select the "New Pacing Plan" button on the top right. Happy running!
    </b-toast>
  </div>
</template>

<script>
import api from '@/api'
import { string2sec } from '../util/time'
import wputil from '../util/waypoints'
import CourseShare from '../components/CourseShare'
import DeleteModal from '../components/DeleteModal'
import SegmentTable from '../components/SegmentTable'
import WaypointTable from '../components/WaypointTable'
import PlanDetails from '../components/PlanDetails'
import PlanEdit from '../components/PlanEdit'
import SunCalc from 'suncalc'
import moment from 'moment-timezone'
const JSURL = require('@yaska-eu/jsurl2')
let html2pdf // will lazy load later

export default {
  title: 'Course',
  components: {
    CourseEdit: () => import(/* webpackPrefetch: true */ '../components/CourseEdit.vue'),
    CourseCompare: () => import(/* webpackPrefetch: true */ '../components/CourseCompare.vue'),
    CourseMap: () => import(/* webpackPrefetch: true */ '../components/CourseMap.vue'),
    CourseProfile: () => import(/* webpackPrefetch: true */ '../components/CourseProfile.vue'),
    CourseShare,
    DeleteModal,
    DownloadTrack: () => import(/* webpackPrefetch: true */ '../components/DownloadTrack.vue'),
    EmailUser: () => import(/* webpackPrefetch: true */ '../components/EmailUser.vue'),
    SegmentTable,
    WaypointTable,
    PlanDetails,
    PlanEdit,
    WaypointEdit: () => import(/* webpackPrefetch: true */ '../components/WaypointEdit.vue')
  },
  data () {
    return {
      initializing: true,
      busy: true,
      editing: false,
      saving: false,
      comparing: false,
      course: {},
      plan: {},
      plans: [],
      points: [],
      printing: false,
      scales: {},
      waypoint: {},
      focus: [],
      tableTabIndex: 0,
      tableTabNames: ['Segments', 'Splits', 'Waypoints', 'Details'],
      updateFlag: false,
      visibleWaypoints: [],
      showMenu: false,
      updatingWaypointTimeout: null,
      updatingWaypointTimeoutID: null,
      url: ''
    }
  },
  computed: {
    tableHeight: function () {
      if (this.$window.width < 992) return 0
      return (this.$window.height - 173)
    },
    description: function () {
      if (this.course.description) {
        return this.course.description
      } else {
        return `The ${this.$title} course covers ${this.$units.distf(this.course.distance, 1)} ${this.$units.dist} with ${this.$units.altf(this.course.gain, 0)} ${this.$units.alt} of climbing. Ready?`
      }
    },
    title: function () {
      return this.$title + ' - ultraPacer'
    },
    event: function () {
      const t = this.$logger()
      const e = {
        start: null,
        startTime: null,
        timezone: moment.tz.guess()
      }
      if (this.plan && this.plan.eventStart) {
        e.start = this.plan.eventStart
        e.timezone = this.plan.eventTimezone
      } else if (this.course.eventStart) {
        e.start = this.course.eventStart
        e.timezone = this.course.eventTimezone
      } else {
        return e
      }
      const m = moment(e.start).tz(e.timezone)
      e.timeString = m.format('kk:mm')
      e.startTime = string2sec(`${e.timeString}:00`)
      if (this.points.length) {
        const times = SunCalc.getTimes(
          m.toDate(),
          this.points[0].lat,
          this.points[0].lon
        )
        e.sun = {
          dawn: string2sec(moment(times.dawn).tz(e.timezone).format('HH:mm:ss')),
          rise: string2sec(moment(times.sunrise).tz(e.timezone).format('HH:mm:ss')),
          set: string2sec(moment(times.sunset).tz(e.timezone).format('HH:mm:ss')),
          dusk: string2sec(moment(times.dusk).tz(e.timezone).format('HH:mm:ss'))
        }
      }
      this.$logger('Course|compute-event', t)
      return e
    },
    heatModel: function () {
      if (
        !this.event.sun ||
        !this.planAssigned ||
        !this.plan.heatModel
      ) { return null }
      const hM = { ...this.plan.heatModel }
      hM.start = this.event.sun.rise + 1800
      hM.stop = this.event.sun.set + 3600
      return hM
    },
    plansSelect: function () {
      const p = []
      for (let i = 0, il = this.plans.length; i < il; i++) {
        p.push({
          value: this.plans[i],
          text: this.plans[i].name
        })
      }
      return p
    },
    owner: function () {
      return (
        this.$user.isAuthenticated &&
        String(this.$user._id) === String(this.course._user)
      )
    },
    planAssigned: function () {
      return Boolean(Object.entries(this.plan).length)
    },
    planOwner: function () {
      return this.planAssigned && (
        (
          this.plan._id &&
          this.$user.isAuthenticated &&
          String(this.$user._id) === String(this.plan._user)
        ) ||
        !this.plan._id
      )
    },
    segments: function () {
      const type = this.planAssigned && this.pacingSplitsReady ? 'plan' : 'course'
      return this[type].splits.segments
    },
    pacingSplitsReady: function () {
      return Boolean(
        this.plan &&
        this.plan.splits &&
        this.plan.splits.miles && this.plan.splits.miles.length &&
        this.plan.splits.kilometers && this.plan.splits.kilometers.length &&
        this.plan.splits.segments && this.plan.splits.segments.length
      )
    },
    splits: function () {
      const type = this.planAssigned && this.pacingSplitsReady ? 'plan' : 'course'
      if (this.$units.dist === 'km') {
        return this[type].splits.kilometers
      } else {
        return this[type].splits.miles
      }
    },
    terrainFactors: function () {
      const l = this.$logger()
      if (!this.course.waypoints) { return [] }
      if (!this.course.waypoints.length) { return [] }
      const wps = this.course.waypoints
      let tF = wps[0].terrainFactor
      const tFs = wps.filter((x, i) => i < wps.length - 1).map((x, i) => {
        if (x.terrainFactor !== null) { tF = x.terrainFactor }
        return {
          start: x.location,
          end: wps[i + 1].location,
          tF: tF
        }
      })
      this.$logger('terrainFactors', l)
      return tFs
    },
    delays: function () {
      const t = this.$logger()
      if (!this.course.waypoints) { return [] }
      if (!this.course.waypoints.length) { return [] }
      if (!this.planAssigned) { return [] }
      const wps = this.course.waypoints
      const wpdelay = (this.planAssigned) ? this.plan.waypointDelay : 0
      const d = []
      wps.forEach((x, i) => {
        if (x.type === 'aid' || x.type === 'water') {
          wps[i].delay = wpdelay
          d.push({
            loc: x.location,
            delay: x.delay
          })
        } else {
          wps[i].delay = 0
        }
      })
      this.$logger('compute-delays', t)
      return d
    },
    publicName: function () {
      return this.course.public ? this.course.name : 'private'
    }
  },
  watch: {
    editing: function (val) {
      // update after disabling editing
      if (!val && this.updateFlag) {
        this.createSplits()
        this.clearPlanSplits()
        this.updatePacing()
      }
    },
    tableTabIndex: function (val) {
      this.focus = []
      // if editing and navigating away from waypoint table, recalc
      if (this.updateFlag && this.tableTabIndex !== 2) {
        this.createSplits()
        this.clearPlanSplits()
        this.updatePacing()
      }
    }
  },
  async created () {
    this.initialize()
  },
  methods: {
    async initialize () {
      this.initializing = true
      this.$status.processing = true
      this.$status.loading = true
      let t = this.$logger()
      try {
        await this.$auth.getAccessToken()
      } catch (err) {}
      t = this.$logger('Course|initialize - auth initiated', t)
      try {
        if (this.$route.params.plan) {
          this.course = await api.getCourse(this.$route.params.plan, 'plan')
        } else if (this.$route.params.permalink) {
          this.course = await api.getCourseFields(
            this.$route.params.permalink,
            'link',
            ['name', 'distance', 'gain'],
            false
          )
          this.$title = this.course.name
          this.course = await api.getCourse(this.$route.params.permalink, 'link')
        } else {
          this.course = await api.getCourse(this.$route.params.course, 'course')
        }
        t = this.$logger('Course|api.getCourse', t)

        if (this.course.link) {
          this.url = window.location.host + this.$router.resolve({ name: 'Race', params: { permalink: this.course.link } }).href
        } else if (this.course._id) {
          this.url = window.location.host + this.$router.resolve({ name: 'Course', params: { course: this.course._id } }).href
        }

        this.refreshVisibleWaypoints()
        this.$gtage(this.$gtag, 'Course', 'view', this.publicName)
        this.plans = this.course.plans || []

        // match waypoints in cached segments w/ actual objects
        this.course.splits.segments.forEach(s => {
          s.waypoint = this.course.waypoints.find(
            wp => wp._id === (s.waypoint._id || s.waypoint)
          )
        })

        if (this.$route.params.plan) {
          this.plan = this.plans.find(
            x => x._id === this.$route.params.plan
          )
          this.$gtage(this.$gtag, 'Plan', 'view', this.publicName)
        }
      } catch (err) {
        console.log(err)
        this.$router.push({ path: '/' })
        return
      }
      this.$title = this.course.name
      if (this.planAssigned) {
        await this.getPoints()
      } else {
        this.getPoints()
      }
      this.initializing = false
      this.busy = false
      this.$status.processing = false
      setTimeout(() => {
        if (!this.$user.isAuthenticated) {
          this.$refs['toast-welcome'].show()
        }
      }, 1000)
      if (this.$route.query.plan) {
        const p = JSURL.tryParse(this.$route.query.plan, null)
        if (p) {
          this.$logger('Course|created: showing plan from URL')
          this.$refs.planEdit.show(p)
        }
      }
      if (this.$route.query.after) {
        const q = { ...this.$route.query }
        const after = this.$route.query.after
        delete q.after
        this.$router.replace({ query: q })
        setTimeout(() => {
          this[after]()
        }, 1000)
      }
      this.$logger('Course|initialize', t)
    },
    async getPoints () {
      let t = this.$logger()
      const pnts = await api.getCourseField(
        this.course._id,
        'points'
      )
      t = this.$logger(`Course|getPoints: downloaded (${pnts.length} points)`, t)
      this.points = this.$core.arraysToObjects(pnts)
      const { points, scales } = this.$core.processPoints(
        this.points,
        this.course.distance,
        this.course.gain,
        this.course.loss
      )
      this.points = points
      this.scales = scales

      // refresh LLA's from course points:
      this.course.waypoints.forEach(wp => {
        wputil.updateLLA(wp, this.points)
      })
      if (this.planAssigned) {
        await this.updatePacing()
      }
      this.$logger('Course|getPoints: complete', t)
      this.$status.loading = false
    },
    async editCourse () {
      this.$refs.courseEdit.show(this.course)
    },
    async reloadCourse () {
      this.focus = []
      await this.initialize()
    },
    async deleteCourse (course, cb) {
      this.$refs.delModal.show(
        {
          type: 'course',
          object: course,
          verb: 'delete'
        },
        async () => {
          await api.deleteCourse(course._id)
          this.$router.push({ name: 'CoursesManager' })
        },
        (err) => {
          if (typeof (cb) === 'function') {
            if (err) cb(err)
            else cb()
          }
        }
      )
    },
    async newWaypoint () {
      this.$refs.wpEdit.show({})
    },
    async editWaypoint (waypoint) {
      this.$refs.wpEdit.show(waypoint)
    },
    async deleteWaypoint (waypoint, cb) {
      this.$refs.delModal.show(
        {
          type: 'waypoint',
          object: waypoint
        },
        async () => {
          this.$gtage(this.$gtag, 'Waypoint', 'delete', this.publicName)
          // if we are editing a waypoint we deleted, remove it from the form
          if (this.waypoint._id === waypoint._id) {
            this.waypoint = {}
          }
          await api.deleteWaypoint(waypoint._id)
          const index = this.course.waypoints.findIndex(
            x => x._id === waypoint._id
          )
          if (index > -1) {
            this.course.waypoints.splice(index, 1)
          }
          this.setUpdateFlag()
        },
        (err) => {
          if (typeof (cb) === 'function') {
            if (err) cb(err)
            else cb()
          }
        }
      )
    },
    updateWaypointLocation (_id, loc) {
      const waypoint = this.course.waypoints.find(wp => wp._id === _id)
      waypoint.location = loc
      wputil.updateLLA(waypoint, this.points)
      wputil.sortWaypointsByDistance(this.course.waypoints)
      if (String(waypoint._id) === this.updatingWaypointTimeoutID) {
        clearTimeout(this.updatingWaypointTimeout)
      }
      this.updatingWaypointTimeoutID = String(waypoint._id)
      this.updatingWaypointTimeout = setTimeout(() => {
        api.updateWaypoint(waypoint._id, waypoint)
      }, 2000)
      this.setUpdateFlag()
    },
    async refreshWaypoints (callback) {
      this.course.waypoints = await api.getWaypoints(this.course._id)
      this.refreshVisibleWaypoints()
      this.setUpdateFlag()
      if (typeof callback === 'function') callback()
    },
    async refreshVisibleWaypoints () {
      this.visibleWaypoints = this.course.waypoints
        .filter(x => x.type === 'start' || x.tier === 1)
        .map(x => { return x._id })
    },
    waypointShowMode (wp) {
      if (this.editing && this.tableTabIndex === 2) {
        return true
      } else if (this.tableTabIndex === 2) {
        return wp.tier <= 2
      } else {
        return this.visibleWaypoints.includes(wp._id)
      }
    },
    async newPlan () {
      this.$gtage(this.$gtag, 'Plan', 'add', this.publicName)
      if (this.planAssigned) {
        const p = this.plan
        this.$refs.planEdit.show({
          heatModel: p.heatModel ? { ...p.heatModel } : null,
          eventStart: p.eventStart,
          eventTimezone: p.eventTimezone,
          pacingMethod: p.pacingMethod,
          waypointDelay: p.waypointDelay,
          drift: p.drift
        })
      } else {
        this.$refs.planEdit.show()
      }
    },
    async editPlan () {
      this.$refs.planEdit.show(this.plan)
    },
    async deletePlan (plan, cb) {
      this.$refs.delModal.show(
        {
          type: 'plan',
          object: plan
        },
        async () => {
          await api.deletePlan(plan._id)
          this.$gtage(this.$gtag, 'Plan', 'delete', this.publicName)
          this.plans = await api.getPlans(this.course._id, this.$user._id)
          if (this.plan._id === plan._id) {
            if (this.plans.length) {
              this.plan = this.plans[0]
              await this.calcPlan()
            } else {
              this.clearPlan()
            }
          }
        },
        (err) => {
          if (typeof (cb) === 'function') {
            if (err) cb(err)
            else cb()
          }
        }
      )
    },
    async refreshPlans (plan, callback) {
      if (this.$auth.isAuthenticated()) {
        this.plans = await api.getPlans(this.course._id, this.$user._id)
        this.plan = this.plans.find(p => p._id === plan._id)
      } else {
        this.plan = { ...plan }
        this.plans = [this.plan]
      }
      await this.calcPlan()
      if (typeof callback === 'function') callback()
    },
    async calcPlan () {
      const t = this.$logger()
      if (!this.planAssigned) { return }
      if (this.plan._id) {
        if (
          this.$router.currentRoute.name !== 'Plan' ||
          this.$router.currentRoute.params.plan !== this.plan._id
        ) {
          this.$router.push({
            name: 'Plan',
            params: {
              plan: this.plan._id
            }
          })
        }
        if (this.owner) {
          api.selectCoursePlan(this.course._id, { plan: this.plan._id })
        }
      } else {
        const route = {
          name: 'Course',
          params: {
            course: this.course._id
          },
          query: {
            plan: JSURL.stringify(this.plan)
          }
        }
        if (this.course.link) {
          route.name = 'Race'
          route.params.permalink = this.course.link
        }
        this.$router.push(route)
      }
      this.$gtage(this.$gtag, 'Plan', 'view', this.publicName)
      if (!this.pacingSplitsReady) {
        this.busy = true
        this.$status.processing = true
        setTimeout(() => { this.updatePacing() }, 10)
      } else {
        if (this.points[0].actual !== undefined) {
          await this.updatePacing()
        }
        this.$refs.profile.update()
      }
      this.$logger('Course|calcPlan', t)
    },
    async clearPlan () {
      // deselect the current plan
      if (!this.planAssigned) { return }
      this.plan = {}
      const route = {
        name: 'Course',
        params: {
          course: this.course._id
        }
      }
      if (this.course.link) {
        route.name = 'Race'
        route.params.permalink = this.course.link
      }
      this.$router.push(route)
      this.$refs.profile.update()
      this.$logger('Course|clearPlan')
    },
    createSplits: async function () {
      const t = this.$logger('go1')
      this.course.splits.segments = await this.$core.segments.createSegments(
        this.points,
        {
          waypoints: this.course.waypoints,
          tFs: this.terrainFactors
        }
      )
      const units = ['kilometers', 'miles']
      units.forEach(async (unit) => {
        this.course.splits[unit] = await this.$core.segments.createSplits(
          this.points,
          unit,
          {
            tFs: this.terrainFactors
          }
        )
      })
      this.$logger('Course|createSplits', t)
    },
    createPlanSplits: async function () {
      const t = this.$logger()
      if (!this.plan.splits) { this.$set(this.plan, 'splits', {}) }
      const segments = await this.$core.segments.createSegments(
        this.points,
        {
          waypoints: this.course.waypoints,
          ...this.plan.pacing,
          startTime: this.event.startTime
        }
      )
      this.$set(this.plan.splits, 'segments', segments)
      const units = ['kilometers', 'miles']
      units.forEach(async (unit) => {
        const s = await this.$core.segments.createSplits(
          this.points,
          unit,
          {
            ...this.plan.pacing,
            startTime: this.event.startTime
          }
        )
        this.$set(this.plan.splits, unit, s)
      })
      this.$logger('Course|createPlanSplits', t)
    },
    clearPlanSplits: function () {
      this.plans.forEach(p => {
        p.splits = {}
      })
    },
    async updatePacing () {
      const t = this.$logger()
      // update splits, segments, and pacing
      this.busy = true
      this.updateFlag = false
      this.$status.processing = true
      const result = this.$core.calcPacing({
        course: this.course,
        plan: this.plan,
        points: this.points,
        pacing: this.plan.pacing,
        event: this.event,
        delays: this.delays,
        heatModel: this.heatModel,
        scales: this.scales,
        terrainFactors: this.terrainFactors
      })
      this.points = result.points
      this.$set(this.plan, 'pacing', result.pacing) // use $set to make reactive

      // update splits and segments
      await this.createPlanSplits()

      // update profile chart
      if (this.$refs.profile) {
        this.$refs.profile.update()
      }

      this.busy = false
      this.$status.processing = false
      this.$logger('Course|updatePacing', t)
    },
    updateFocus: function (type, focus) {
      this.focus = focus
    },
    waypointClick: function (id) {
      this.tableTabIndex = 2
      this.$refs.waypointTable.selectWaypoint(id)
    },
    waypointShow: function (arr) {
      arr.forEach(_id => {
        if (!this.visibleWaypoints.includes(_id)) {
          this.visibleWaypoints.push(_id)
        }
      })
    },
    waypointHide: function (arr) {
      arr.forEach(_id => {
        const i = this.visibleWaypoints.findIndex(x => x === _id)
        if (i >= 0) {
          this.visibleWaypoints.splice(i, 1)
        }
      })
    },
    setUpdateFlag: function () {
      this.updateFlag = true
    },
    async download () {
      await this.$refs.download.show()
    },
    async changeOwner (_user) {
      if (!this.$user.admin) { return }
      await api.updateCourse(this.course._id, { _user: _user })
    },
    async setPermalink (link) {
      if (!this.$user.admin) { return }
      await api.updateCourse(this.course._id, { link: link })
    },
    async stopCompare (cb) {
      this.comparing = false
      if (typeof cb === 'function') cb()
    },
    async loadCompare () {
      this.$refs.courseCompare.show(
        async (actual) => {
          await new Promise(resolve => setTimeout(resolve, 100)) // sleep a bit
          if (this.points[0].elapsed === undefined) {
            await this.updatePacing()
          }
          this.$status.processing = true
          const res = await this.$core.addActuals(this.points, actual)
          if (res.match) {
            this.$gtage(this.$gtag, 'Course', 'compare', this.publicName, 1)
            this.comparing = true
            this.createPlanSplits()
          } else {
            this.$gtage(this.$gtag, 'Course', 'compare', this.publicName, 0)
            this.comparing = false
          }
          this.$status.processing = false
          return res
        }
      )
    },
    async print (component) {
      const t = this.$logger()

      // define $refs for each print component:
      const refs = {
        Segments: 'segmentTable',
        Splits: 'splitTable',
        Waypoints: 'waypointTable',
        Details: 'planDetails',
        Profile: 'profile'
      }

      // clear focus, if any:
      if (this.focus.length) {
        this.focus = []
        if (component === 'Segments' || component === 'Splits') {
          await this.$refs[refs[component]].clear()
        }
      }

      // save devicePixelRatio to restore later, set new one to 4
      // this is for resolution of print
      const oldPixelRatio = window.devicePixelRatio
      window.devicePixelRatio = 4

      // set printing status
      this.printing = component
      this.$status.processing = true

      // set filename:
      let filename = `uP-${this.course.name}${(this.plan.name ? ('--' + this.plan.name) : '')}--${component}.pdf`
      filename = filename.replace(/ /g, '_')

      // pdf printing options:
      const opt = {
        margin: [0.75, 0.5, 0.5, 0.5],
        filename: filename,
        image: { type: 'jpeg', quality: 1 },
        html2canvas: { scale: 4 },
        jsPDF: {
          unit: 'in',
          format: 'letter',
          orientation: this.tableTabIndex === 3 ? 'portrait' : 'landscape'
        }
      }
      if (component !== 'Profile') {
        opt.pagebreak = { mode: 'avoid-all' }
      }

      // define logo image for header:
      const logo = new Image()
      logo.src = '/public/img/logo.png'

      // if profile print, render chart to print size:
      if (component === 'Profile') {
        await this.$refs.profile.$refs.profile.update()
        await new Promise(resolve => setTimeout(resolve, 500))
      }
      // lazy load the html2pdf module:
      if (!html2pdf) {
        this.$logger('Course|print importing html2pdf')
        await import(/* webpackPrefetch: true */ 'html2pdf.js')
          .then(mod => { html2pdf = mod.default })
      }
      // execute printing:
      this.$nextTick(() => {
        html2pdf()
          .set(opt)
          .from(this.$refs[refs[component]].$el)
          .toPdf()
          .get('pdf')
          .then((pdf) => {
            // add header and logo
            const totalPages = pdf.internal.getNumberOfPages()
            for (let i = 1; i <= totalPages; i++) {
              pdf.setPage(i)

              // write ultraPacer:
              pdf.setFontSize(16)
              pdf.text('ultraPacer', 0.5, 0.6)

              // write description and page number:
              const arr = [
                `Course: ${this.course.name}`,
                component
              ]
              if (this.plan.name) arr.splice(1, 0, `Plan: ${this.plan.name}`)
              if (totalPages > 1) arr.push(`Page ${i} of ${totalPages}`)
              pdf.setFontSize(12)
              pdf.text(
                arr.join('  |  '),
                1.75,
                0.6
              )

              // add URL
              pdf.setFontSize(10)
              pdf.setTextColor(128, 128, 128)
              pdf.text(
                window.location.href,
                pdf.internal.pageSize.getWidth() - 0.5,
                pdf.internal.pageSize.getHeight() - 0.32,
                'right'
              )

              // add logo to top right:
              pdf.addImage(logo, 'JPEG', pdf.internal.pageSize.getWidth() - 1, 0.2, 0.5, 0.5)
            }
          }).save().then(() => {
            this.$gtag.event('print', { event_category: component, event_label: this.publicName })

            // reset status:
            this.printing = false
            this.$status.processing = false

            // restore devicePixelRatio:
            window.devicePixelRatio = oldPixelRatio

            // if profile print, render chart to original size:
            if (component === 'Profile') {
              this.$nextTick(() => { this.$refs.profile.update() })
            }
            this.$logger(`Course|print ${component}`, t)
          })
      })
    },
    async emailOwner () {
      if (this.$user.isAuthenticated) {
        this.$refs.emailOwner.show()
      } else {
        this.$parent.login({ after: 'emailOwner' })
      }
    }
  }
}
</script>
