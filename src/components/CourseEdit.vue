<template>
  <div>
    <b-modal
      ref="modal"
      centered
      :title="(model._id ? 'Edit' : 'New') + ' Course'"
      hide-header-close
      :no-close-on-esc="$status.processing"
      :no-close-on-backdrop="$status.processing"
      @hidden="clear"
      @cancel="clear"
      @ok="handleOk"
    >
      <form
        ref="courseform"
        style="min-height: 100px"
        @submit.prevent=""
      >
        <selectable-label-input
          v-model="model.source.type"
          :options="sourceOptions"
          @input="sourceChange"
        >
          <b-form-file
            v-if="model.source.type==='gpx'"
            v-model="gpxFile"
            :placeholder="(model.source) ? model.source.name : 'Choose a GPX file...'"
            accept=".gpx"
            no-drop
            :required="!Boolean(model.source)"
            :state="!Boolean(gpxFileInvalidMsg)"
            @change="loadFile"
          />
          <b-form-invalid-feedback :state="!Boolean(gpxFileInvalidMsg)">
            {{ gpxFileInvalidMsg }}
          </b-form-invalid-feedback>
          <form-tip v-if="model.source.type==='gpx' && showTips">
            Required: ".gpx" format file exported from a GPS track or route builder.
          </form-tip>
          <strava-route-input
            v-if="model.source.type==='strava-route'"
            ref="stravaRouteInput"
            v-model="model.source"
            :show-tips="showTips"
            class="mb-0"
            @loadGPX="loadGPX"
            @change="courseLoaded=false"
          />

          <b-input-group
            v-if="courseLoaded === true || model._id"
            prepend="Elevation Data"
            class="mt-1"
          >
            <b-form-select
              v-model="model.source.alt"
              type="number"
              :options="altSourceOptions"
              required
              @input="changeAltSource"
            />
          </b-input-group>
          <form-tip v-if="model.source.type==='gpx' && showTips">
            Required: data source for elevation.
          </form-tip>
          <b-input-group
            v-if="courseLoaded === true && stats"
            prepend="Stats"
            class="mt-1"
          >
            <div
              class="form-control form-group p-1 mb-0"
              style="height:auto"
            >
              <b-row>
                <b-col
                  cols="4"
                  sm="3"
                  lg="3"
                  class="text-right pr-0"
                >
                  Dist:
                </b-col>
                <b-col>{{ $units.distf(stats.dist, 2) | commas }}  {{ $units.dist }}</b-col>
              </b-row>
              <b-row>
                <b-col
                  cols="4"
                  sm="3"
                  lg="3"
                  class="text-right pr-0"
                >
                  Gain:
                </b-col>
                <b-col>{{ $units.altf(stats.gain, 0) | commas }}  {{ $units.alt }}</b-col>
              </b-row>
              <b-row>
                <b-col
                  cols="4"
                  sm="3"
                  lg="3"
                  class="text-right pr-0"
                >
                  Loss:
                </b-col>
                <b-col>{{ -$units.altf(stats.loss, 0) | commas }}  {{ $units.alt }}</b-col>
              </b-row>
            </div>
          </b-input-group>
        </selectable-label-input>
        <div v-if="courseLoaded === true || model._id">
          <b-input-group
            prepend="Name"
            class="mt-1"
          >
            <b-form-input
              v-model="model.name"
              type="text"
              required
            />
          </b-input-group>
          <form-tip v-if="showTips">
            Required: name for the course; for example: "Western States 100".
          </form-tip>
          <b-input-group
            prepend="Description"
            class="mt-1"
          >
            <b-form-textarea
              v-model="model.description"
              rows="2"
            />
          </b-input-group>
          <form-tip v-if="showTips">
            Optional: description for your course or race.
          </form-tip>
          <date-time-input
            v-model="moment"
            :show-tips="showTips"
          >
            <template #date-tip>
              Optional: use for organized races. Plans made for this course can set thier own times.
            </template>
          </date-time-input>
          <b-form-checkbox
            v-model="model.override.enabled"
            class="mt-1"
            :unchecked-value="false"
            @change="setDistGainLoss"
          >
            Override distance/gain/loss from source
          </b-form-checkbox>
          <form-tip v-if="showTips">
            Optional: enable to manually specify distance/elevation.
          </form-tip>
          <b-form-group
            v-if="model.override.enabled"
            class="mb-0 pl-3"
          >
            <b-input-group
              prepend="Distance"
              class="mt-1"
            >
              <b-form-input
                v-model="distancef"
                type="number"
                required
                step="0.01"
                :min="$math.round((stats ? stats.dist : model.distance) * ((model.override.distUnit === 'mi') ? 0.621371 : 1) * 0.9, 2)"
                :max="$math.round((stats ? stats.dist : model.distance) * ((model.override.distUnit === 'mi') ? 0.621371 : 1) * 1.1, 2)"
                @input="updateDistance"
              />
              <b-form-select
                v-model="model.override.distUnit"
                :options="distUnits"
                required
                @change="updateDistanceUnit"
              />
            </b-input-group>
            <form-tip v-if="showTips">
              Required (if Override is enabled): specify distance and units.
            </form-tip>
            <b-input-group
              prepend="Elevation Gain"
              class="mt-1"
            >
              <b-form-input
                v-model="gainf"
                type="number"
                required
                step="0"
                :min="$math.round((stats ? stats.gain : model.gain) * ((model.override.elevUnit === 'ft') ? 3.28084 : 1) * 0.8, 0)"
                :max="$math.round((stats ? stats.gain : model.gain) * ((model.override.elevUnit === 'ft') ? 3.28084 : 1) * 1.2, 0)"
                @input="updateGain"
              />
              <b-form-select
                v-model="model.override.elevUnit"
                :options="elevUnits"
                required
                @change="updateElevUnit"
              />
            </b-input-group>
            <form-tip v-if="showTips">
              Required (if Override is enabled): specify climbing/gain and units.
            </form-tip>
            <b-input-group
              prepend="Elevation Loss"
              class="mt-1"
            >
              <b-form-input
                v-model="lossf"
                type="number"
                required
                step="0"
                :min="$math.round(-(stats ? stats.loss : model.gain) * ((model.override.elevUnit === 'ft') ? 3.28084 : 1) * 0.8, 0)"
                :max="$math.round(-(stats ? stats.loss : model.gain) * ((model.override.elevUnit === 'ft') ? 3.28084 : 1) * 1.2, 0)"
                @input="updateLoss"
              />
              <b-form-select
                v-model="model.override.elevUnit"
                :options="elevUnits"
                required
                @change="updateElevUnit"
              />
            </b-input-group>
            <form-tip v-if="showTips">
              Required (if Override is enabled): specify descent/loss and units.
            </form-tip>
          </b-form-group>
          <b-form-checkbox
            v-model="model.public"
            :value="true"
            class="mt-1"
            :unchecked-value="false"
          >
            Visible to public
          </b-form-checkbox>
          <form-tip v-if="showTips">
            Optional: allow link sharing for course and plans (to anybody).
          </form-tip>
          <b-input-group
            v-if="model.public && $user.admin"
            prepend="Permalink"
            class="mt-1"
          >
            <b-form-input
              v-model="model.link"
              type="text"
            />
          </b-input-group>
          <form-tip v-if="model.public && $user.admin && showTips">
            Optional: readable link for official races; https://ultrapacer.com/race/(permalink).
          </form-tip>
        </div>
      </form>
      <template #modal-footer="{ ok, cancel }">
        <div
          style="text-align: left; flex: auto"
        >
          <b-button
            size="sm"
            variant="warning"
            @click="$refs.help.show()"
          >
            Docs
          </b-button>
          <b-button
            size="sm"
            variant="warning"
            @click="toggleTips()"
          >
            Tips
          </b-button>
        </div>
        <b-button
          v-if="model._id"
          variant="danger"
          @click="remove"
        >
          Delete
        </b-button>
        <b-button
          variant="secondary"
          @click="cancel()"
        >
          Cancel
        </b-button>
        <b-button
          variant="primary"
          :disabled="courseLoaded !== true"
          @click="ok()"
        >
          Save
        </b-button>
      </template>
    </b-modal>
    <b-modal
      ref="help"
      :title="`Course ${model._id ? 'Edit' : 'Create'} Help`"
      size="lg"
      scrollable
      ok-only
    >
      <help-doc class="documentation" />
    </b-modal>
  </div>
</template>

<script>
import api from '@/api'
import DateTimeInput from '../forms/DateTimeInput'
import FormTip from '../forms/FormTip'
import HelpDoc from '@/docs/course.md'
import SelectableLabelInput from '../forms/SelectableLabelInput'
import StravaRouteInput from '../forms/StravaRouteInput'
import moment from 'moment-timezone'
import wputil from '@/util/waypoints'
const gpxParse = require('gpx-parse')
export default {
  components: {
    DateTimeInput,
    FormTip,
    HelpDoc,
    StravaRouteInput,
    SelectableLabelInput
  },
  data () {
    return {
      courseLoaded: false,
      defaults: {
        override: {
          enabled: false,
          distUnit: 'mi',
          elevUnit: 'ft'
        },
        source: { type: 'gpx' }
      },
      distUnits: [
        { value: 'mi', text: 'mi' },
        { value: 'km', text: 'km' }
      ],
      elevUnits: [
        { value: 'ft', text: 'ft' },
        { value: 'm', text: 'm' }
      ],
      file: null,
      gpxFile: null,
      gpxFileInvalidMsg: '',
      gpxFileNoElevFlag: false,
      gpxPoints: [],
      model: { source: {} },
      moment: null,
      points: [],
      prevDist: 0,
      rawLoaded: false,
      showTips: false,
      stats: null,
      distancef: null,
      gainf: null,
      lossf: null,
      sourceOptions: [
        { value: 'gpx', text: 'GPX File' },
        { value: 'strava-route', text: 'Strava Route' }
      ],
      newPointsFlag: false // to track whether we need to upload new points
    }
  },
  computed: {
    altSourceOptions: function () {
      const arr = []
      if (this.model.source) {
        if (this.model.source.type === 'strava-route') {
          arr.push({ value: 'strava-route', text: 'Strava Route' })
        } else if (this.model.source.alt === 'gpx' || (this.file && !this.gpxFileNoElevFlag)) {
          arr.push({ value: 'gpx', text: 'GPX File' })
        }
        arr.push(
          { value: 'google', text: 'Google' },
          { value: 'elevation-api', text: 'Elevation API' }
        )
      }
      return arr
    }
  },
  watch: {
    'model.public': function (v) {
      if (!v) { this.model.link = null }
    }
  },
  methods: {
    async show (course, raw = null) {
      this.courseLoaded = false
      this.newPointsFlag = false
      this.showTips = false
      this.moment = null
      this.gpxFileInvalidMsg = ''
      if (course._id) {
        this.model = JSON.parse(JSON.stringify(course)) // deep clone course
        if (!this.model.source.alt) this.$set(this.model.source, 'alt', this.model.source.type)
        this.prevDist = course.distance
        const tz = this.model.eventTimezone || moment.tz.guess()
        if (this.model.eventStart) {
          this.moment = moment(this.model.eventStart).tz(tz)
        } else {
          this.moment = moment(0).tz(tz)
        }
        this.model.override = { ...course.override }
        this.updateDistanceUnit(this.model.override.distUnit)
        this.updateElevUnit(this.model.override.elevUnit)
        this.courseLoaded = this.reloadPoints(course.reduced ? 'raw' : 'points')
      } else {
        this.moment = moment(0).tz(moment.tz.guess())
        this.model = JSON.parse(JSON.stringify(this.defaults))
      }
      this.$refs.modal.show()
      this.$status.processing = false
    },
    handleOk (bvModalEvt) {
      bvModalEvt.preventDefault()
      if (this.$refs.courseform.reportValidity()) {
        this.save()
      }
    },
    async reloadPoints (field) {
      const arr = await api.getCourseField(this.model._id, field)
      this.gpxPoints = this.$core.arraysToObjects(arr)
      this.$core.addLoc(this.gpxPoints)
      this.stats = this.$core.calcStats(this.gpxPoints, true)
      this.courseLoaded = true
      return true
    },
    async save () {
      if (this.$status.processing) { return }
      this.$status.processing = true

      // if we have new points data, format and update:
      let points = []
      if (this.newPointsFlag && this.gpxPoints.length) {
        points = this.gpxPoints
        this.points = this.$core.reduce(points, this.model.distance)

        // reformat points for upload
        this.model.reduced = this.points.length !== points.length
        if (this.model.reduced) {
          this.model.points = this.points.map(x => {
            return [
              x.loc,
              this.$math.round(x.lat, 6),
              this.$math.round(x.lon, 6),
              this.$math.round(x.alt, 2),
              this.$math.round(x.grade, 4)
            ]
          })
          this.model.raw = points.map(x => {
            return [x.lat, x.lon, x.alt]
          })
        } else {
          this.model.points = points.map(x => {
            return [x.lat, x.lon, x.alt]
          })
          this.model.raw = null
        }
      }

      this.model.eventTimezone = this.moment.tz()
      if (Number(this.moment.format('YYYY') > 1970)) {
        this.model.eventStart = this.moment.toDate()
      } else {
        this.model.eventStart = null
      }

      if (this.model._id) {
        const updateModel = {}
        const fields = [
          'name',
          'link',
          'description',
          'public',
          'eventStart',
          'eventTimezone',
          'distance',
          'gain',
          'loss',
          'override'
        ]

        // only include new points info if we have a new course source:
        if (this.newPointsFlag) {
          fields.push('source', 'raw', 'reduced', 'points')
        }
        fields.forEach(f => {
          if (this.model[f] !== undefined) {
            updateModel[f] = this.model[f]
          }
        })
        await api.updateCourse(this.model._id, updateModel)
        this.$gtag.event('edit', { event_category: 'Course' })

        // update all waypoints to fit updated course:
        const diff = this.model.distance - this.prevDist
        const scaleWaypoints = this.$math.round(diff, 4) !== 0
        if (scaleWaypoints || this.newPointsFlag) {
          const waypoints = await api.getWaypoints(this.model._id)
          // if the distance changed locations by new length
          if (scaleWaypoints) {
            this.$logger('CourseEdit|save: scaling waypoints to new distance')
            waypoints.forEach(wp => {
              if (wp.type === 'finish') {
                wp.location = this.model.distance
              } else if (wp.type !== 'start') {
                wp.location = wp.location * this.model.distance / this.prevDist
              }
            })
          }
          // if the course changed, map them to the new course LLA's
          if (this.newPointsFlag) {
            this.$logger('CourseEdit|save: mapping waypoints to new course')
            waypoints.forEach(wp => {
              if (wp.type !== 'start' && wp.type !== 'finish') {
                try {
                  // limit of 0.5 km or 5% of total:
                  const limit = Math.max(0.5, 0.05 * this.model.distance)
                  // resolve closest distance along course for waypoint LLA
                  wp.location = wputil.nearestLoc(wp, this.points, limit)
                } catch (err) {
                  console.log(err)
                }
              }
              wputil.updateLLA(wp, this.points)
            })
          }
          // save them all
          await Promise.all(waypoints.map(async wp => {
            await api.updateWaypoint(wp._id, wp)
            this.$logger(`CourseEdit|save: updated waypoint ${wp.name}`)
          }))
        }
      } else {
        await api.createCourse(this.model)
        this.$gtag.event('create', { event_category: 'Course' })
      }
      this.$status.processing = false
      await this.$emit('refresh')
      this.clear()
      this.$refs.modal.hide()
    },
    clear () {
      this.gpxPoints = []
      this.model = JSON.parse(JSON.stringify(this.defaults))
      this.file = null
      this.newPointsFlag = false
      this.gpxFileNoElevFlag = false
    },
    async remove () {
      this.$emit('delete', this.model, async (err) => {
        if (!err) {
          this.$gtag.event('delete', { event_category: 'Course' })
          this.$refs.modal.hide()
        }
      })
    },
    async loadFile (f) {
      this.file = f
      const t = this.$logger()
      this.$nextTick(async () => {
        const reader = new FileReader()
        reader.onload = e => {
          this.$logger('CourseEdit|GPX file read', t)
          const source = {
            type: 'gpx',
            name: this.gpxFile.name.split('.')[0],
            alt: 'gpx'
          }
          this.loadGPX(e.target.result, source)
        }
        if (f.target.files.length) {
          this.$status.processing = true
          this.gpxFileNoElevFlag = false
          reader.readAsText(f.target.files[0])
        }
      })
    },
    async loadGPX (f, source) {
      const t = this.$logger()

      gpxParse.parseGpx(f, async (error, data) => {
        if (error) {
          this.gpxFileInvalidMsg = `File format invalid: ${error.toString()}`
          this.$status.processing = false
          throw error
        } else {
          this.$logger('CourseEdit|GPX parsed', t)
          this.model.source = { ...source }
          this.gpxPoints = data.tracks[0].segments[0].map(p => {
            return {
              alt: p.elevation,
              lat: p.lat,
              lon: p.lon
            }
          })
          if (this.gpxPoints.length < 100) {
            this.gpxFileInvalidMsg = 'GPX file has too few points.'
            this.$status.processing = false
            return
          }
          if (this.gpxPoints.length > 100000) {
            this.gpxFileInvalidMsg = 'File exceeds size limit of 100,000 points. If this is a valid file, contact me for help.'
            this.$status.processing = false
            return
          }
          this.$core.addLoc(this.gpxPoints)
          this.gpxPoints = this.$core.cleanUp(this.gpxPoints)
          this.stats = this.$core.calcStats(this.gpxPoints, true)
          if (this.$config.requireGPXElevation && this.stats.gain === 0) {
            this.gpxFileNoElevFlag = true
            const t2 = this.$logger('CourseEdit|loadGPX getting elevation data')
            try {
              await this.addElevationData(this.gpxPoints)
              this.$logger(`CourseEdit|loadGPX received elevation data for ${this.gpxPoints.length} points`, t2)
              this.stats = this.$core.calcStats(this.gpxPoints, true)
            } catch (err) {
              this.gpxFileInvalidMsg = 'File does not contain elevation data and data is not available.'
              this.$logger('CourseEdit|loadGPX failed to get elevation data.', t2)
              this.$gtag.exception({ description: err.message || err, fatal: false })
              this.$status.processing = false
              return
            }
          }
          this.gpxFileInvalidMsg = ''
          this.updateModelGainLoss()
          if (!this.model.name) {
            this.model.name = this.model.source.name
          }
          await this.defaultTimezone(this.gpxPoints[0].lat, this.gpxPoints[0].lon)
          this.courseLoaded = true
          this.newPointsFlag = true
          this.$status.processing = false
        }
      })
    },
    changeAltSource: async function (val) {
      if (this.gpxPoints.length) {
        this.$set(this.model.source, 'alt', val)
        if (val === 'strava-route') {
          this.$refs.stravaRouteInput.getStravaRoute()
        } else if (val === 'gpx') {
          this.loadFile(this.file)
        } else {
          this.$status.processing = true
          const t2 = this.$logger('CourseEdit|changeAltSource getting elevation data')
          try {
            await this.addElevationData(this.gpxPoints, val)
            this.$logger(`CourseEdit|changeAltSource received elevation data for ${this.gpxPoints.length} points`, t2)
            this.stats = this.$core.calcStats(this.gpxPoints, true)
            this.updateModelGainLoss()
          } catch (err) {
            this.gpxFileInvalidMsg = 'Elevation data and data is not available.'
            this.$logger('CourseEdit|changeAltSource failed to get elevation data.', t2)
            this.$gtag.exception({ description: err.message || err, fatal: false })
            this.$status.processing = false
            return
          }
          this.$status.processing = false
        }
        this.newPointsFlag = true
      }
    },
    updateModelGainLoss: function () {
      if (!this.model.override || !this.model.override.enabled) {
        this.model.gain = this.stats.gain
        this.model.loss = this.stats.loss
        this.model.distance = this.stats.dist
        this.setDistGainLoss()
      }
    },
    setDistGainLoss: async function (val = false) {
      this.model.override.distUnit = this.$units.dist
      this.model.override.elevUnit = this.$units.alt
      if (!val) {
        if (this.courseLoaded !== true) {
          this.$status.processing = true
          await this.courseLoaded
          this.$status.processing = false
        }
        this.model.gain = this.stats.gain
        this.model.loss = this.stats.loss
        this.model.distance = this.stats.dist
        this.updateDistanceUnit(this.model.override.distUnit)
        this.updateElevUnit(this.model.override.elevUnit)
      } else {
        this.updateDistanceUnit(this.$units.dist)
        this.updateElevUnit(this.$units.alt)
      }
      this.$set(this.model.override, 'enabled', val)
    },
    updateDistance: function (val) {
      this.model.distance = val / ((this.model.override.distUnit === 'mi') ? 0.621371 : 1)
    },
    async updateDistanceUnit (val) {
      this.distancef = this.$math.round(this.model.distance * ((val === 'mi') ? 0.621371 : 1), 2)
    },
    updateGain: function (val) {
      this.model.gain = val / ((this.model.override.elevUnit === 'ft') ? 3.28084 : 1)
    },
    updateLoss: function (val) {
      this.model.loss = -val / ((this.model.override.elevUnit === 'ft') ? 3.28084 : 1)
    },
    async updateElevUnit (val) {
      this.gainf = this.$math.round(this.model.gain * ((val === 'ft') ? 3.28084 : 1), 0)
      this.lossf = -this.$math.round(this.model.loss * ((val === 'ft') ? 3.28084 : 1), 0)
    },
    async defaultTimezone (lat, lon) {
      const tz = await api.getTimeZone(lat, lon)
      if (Number(this.moment.format('YYYY') > 1970)) {
        this.moment = moment(this.moment.utc().tz(tz))
      } else {
        this.moment = moment(0).tz(tz)
      }
    },
    showHelp () {
      this.$refs.help.show()
    },
    toggleTips () {
      this.showTips = !this.showTips
    },
    sourceChange (val) {
      this.gpxFile = null
      this.gpxPoints = []
      this.courseLoaded = false
      delete this.model.source.name
      this.model.source.alt = val
    },
    async addElevationData (points, source) {
      const lls = points.map(p => {
        return [
          this.$math.round(p.lat, 6),
          this.$math.round(p.lon, 6)
        ]
      })
      const data = await this.$utils.timeout(
        api.getElevation(lls, source),
        15000
      )
      if (lls.length === data.alts.length) {
        points.forEach((p, i) => {
          p.alt = data.alts[i]
        })
        this.$set(this.model.source, 'alt', data.source)
        this.$gtag.event('addElevationData', { event_category: 'Course', event_label: data.source })
      } else {
        throw new Error('Elevation data returned does not match.')
      }
    }
  }
}
</script>
