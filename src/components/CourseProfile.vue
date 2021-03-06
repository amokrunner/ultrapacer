<template>
  <div>
    <line-chart
      ref="profile"
      :chart-data="chartData"
      :options="chartOptions"
      :style="printing ? 'width: 9.9in; height: 7.25in' : 'height: 300px'"
    />
    <div style=" width: 100%; display: flex; justify-content: flex-end;">
      <img
        v-if="course && course.source && course.source.alt === 'google'"
        src="../assets/powered_by_google_on_white.png"
        style="margin-top: -50px; position: absolute; padding-right: 38px;"
      >
    </div>
  </div>
</template>
<script>
import LineChart from './LineChart.js'
import timeUtil from '../util/time'

export default {
  components: {
    LineChart
  },
  props: {
    course: {
      type: Object,
      required: true
    },
    points: {
      type: Array,
      required: true
    },
    printing: {
      type: Boolean,
      default: false
    },
    waypoints: {
      type: Array,
      default () { return [] }
    },
    sunEvents: {
      type: Array,
      default () { return [] }
    },
    showActual: {
      type: Boolean,
      default: false
    },
    focus: {
      type: Array,
      default () { return [] }
    }
  },
  data () {
    return {
      chartColors: {
        red: 'rgb(255, 0, 0)',
        darkgreen: 'rgb(0, 140, 140)',
        darkblue: 'rgb(45, 45, 200)',
        black: 'rgb(0, 0, 0)',
        white: 'rgb(255, 255, 255)'
      },
      chartProfile: [],
      chartGrade: [],
      markerStyles: {
        pointRadius: {
        },
        pointStyle: {
          landmark: 'triangle',
          water: 'rectRot',
          junction: 'crossRot'
        },
        color: {
          aid: 'red',
          landmark: 'darkgreen',
          water: 'darkblue',
          start: 'black',
          finish: 'black'
        }
      },
      pmax: 500,
      chartOptions: {
        animation: {
          duration: 0
        },
        responsive: true,
        maintainAspectRatio: false,
        height: '100px',
        scales: {
          xAxes: [{
            type: 'linear',
            position: 'bottom',
            ticks: {
              stepSize: 5,
              callback: function (value, index, values) {
                if (value % 5 === 0) {
                  return value
                } else {
                  return ''
                }
              },
              max: this.$units.distf(this.course.distance) + 0.01
            }
          }],
          yAxes: [{
            display: true,
            position: 'left',
            id: 'y-axis-1'
          }, {
            type: 'linear',
            display: true,
            position: 'right',
            id: 'y-axis-2'
          }, {
            type: 'linear',
            display: false,
            position: 'right',
            id: 'y-axis-3',
            scaleLabel: {
              display: true,
              labelString: 'Ahead/Behind',
              padding: 0
            },
            ticks: {
              callback: function (value, index, values) {
                const sign = value >= 0 ? '' : '-'
                return sign + timeUtil.sec2string(Math.abs(value), '[h]:m:ss')
              },
              stepSize: 60,
              maxTicksLimit: 12
            }
          }]
        },
        tooltips: {
          displayColors: false,
          enabled: true,
          filter: function (tooltipItem) {
            return tooltipItem.datasetIndex === 0
          },
          callbacks: {
            label: function (tooltipItem, data) {
              const label = data.datasets[tooltipItem.datasetIndex]
                .data[tooltipItem.index].label
              return label
            },
            title: function (tooltipItem, data) {
              if (!tooltipItem.length) { return '' }
              const title = data.datasets[tooltipItem[0].datasetIndex]
                .data[tooltipItem[0].index].title
              return title
            }
          }
        },
        legend: {
          display: false
        },
        onClick: this.click,
        backgroundRules: []
      }
    }
  },
  computed: {
    chartData: function () {
      this.$logger('CourseProfile|chartData')
      const datasets = [
        this.chartWaypoints,
        {
          data: this.chartFocus,
          pointRadius: 0,
          pointHoverRadius: 0,
          borderColor: this.$colors.red2,
          borderWidth: 2,
          backgroundColor: this.showActual ? false : this.transparentize(this.$colors.red2, 0.5),
          yAxisID: 'y-axis-1'
        },
        {
          data: this.chartProfile,
          pointRadius: 0,
          pointHoverRadius: 0,
          borderColor: this.$colors.blue2,
          borderWidth: 2,
          backgroundColor: this.showActual ? false : this.transparentize(this.$colors.blue2),
          yAxisID: 'y-axis-1'
        },
        {
          data: this.chartGrade,
          pointRadius: 0,
          pointHoverRadius: 0,
          backgroundColor: this.showActual ? false : this.transparentize(this.$colors.red2, 0.75),
          showLine: true,
          yAxisID: 'y-axis-2'
        }
      ]
      if (this.showActual) {
        datasets.push({
          data: this.comparePoints,
          pointRadius: 0,
          pointHoverRadius: 0,
          borderColor: 'rgb(94, 131, 81)',
          borderWidth: 2,
          backgroundColor: this.transparentize('rgb(94, 131, 81)', 0.7),
          showLine: true,
          yAxisID: 'y-axis-3'
        })
      }
      return {
        datasets: datasets
      }
    },
    chartFocus: function () {
      const cF = []
      this.chartProfile.forEach(xy => {
        if (
          xy.x >= this.$units.distf(this.focus[0]) &&
          xy.x <= this.$units.distf(this.focus[1])
        ) {
          cF.push(xy)
        }
      })
      return cF
    },
    xs: function () {
      return Array(this.pmax + 1).fill(0).map((e, i) => i++ * this.course.distance / this.pmax)
    },
    comparePoints: function () {
      if (this.showActual) {
        const mbs = this.$math.wlslr(
          this.points.map(p => { return p.loc }),
          this.points.map(p => { return p.elapsed - p.actual.elapsed }),
          this.xs,
          2 * this.course.distance / this.pmax
        )
        const arr = []
        this.xs.forEach((x, i) => {
          arr.push({
            x: this.$units.distf(x),
            y: mbs[i][0] * this.xs[i] + mbs[i][1]
          })
        })
        this.$logger('CourseProfile|comparePoints updated')
        return arr
      } else {
        this.$logger('CourseProfile|comparePoints updated (empty)')
        return []
      }
    },
    chartWaypoints: function () {
      this.$logger('CourseProfile|chartWaypoints')
      if (!this.waypoints.length) { return [] }
      const len = this.waypoints.length
      return {
        data: this.waypoints.map(wp => {
          return {
            x: this.$units.distf(wp.location),
            y: this.$units.altf(wp.elevation),
            label:
              wp.name + ' [' +
              this.$units.distf(wp.location, 1) +
              this.$units.dist + ']',
            title: this.$waypointTypes[wp.type],
            _id: wp._id
          }
        }),
        backgroundColor: this.waypoints.map(wp => {
          return this.transparentize(
            this.chartColors[this.markerStyles.color[wp.type] || 'white']
          )
        }),
        borderColor: this.waypoints.map(wp => {
          return this.chartColors[this.markerStyles.color[wp.type] || 'black']
        }),
        borderWidth: Array(len).fill(2),
        fill: false,
        pointRadius: this.waypoints.map(wp => {
          return this.markerStyles.pointRadius[wp.type] || 6
        }),
        pointStyle: Array(len).fill('circle'),
        pointHoverRadius: 10,
        showLine: false
      }
    }
  },
  watch: {
    showActual: function (val) {
      this.chartOptions.scales.yAxes[1].display = !val
      this.chartOptions.scales.yAxes[2].display = val
      this.update()
    },
    sunEvents: function (val) {
      this.updateBackgroundRules()
    }
  },
  async created () {
    this.updateChartProfile()
    this.updateBackgroundRules()
  },
  methods: {
    click: function (point, event) {
      if (!event.length) { return }
      const item = event[0]
      const id = this.chartWaypoints.data[item._index]._id
      this.$emit('waypointClick', id)
    },
    updateChartProfile: function () {
      this.$logger('CourseProfile|updateChartProfile')
      const chartProfile = []
      let mbs = this.$math.wlslr(
        this.points.map(p => { return p.loc }),
        this.points.map(p => { return p.alt }),
        this.xs,
        this.course.distance / this.pmax / 5
      )
      this.xs.forEach((x, i) => {
        chartProfile.push({
          x: this.$units.distf(x),
          y: this.$units.altf(mbs[i][0] * this.xs[i] + mbs[i][1])
        })
      })

      const chartGrade = []
      mbs = this.$math.wlslr(
        this.points.map(p => { return p.loc }),
        this.points.map(p => { return p.alt }),
        this.xs,
        5 * this.course.distance / this.pmax
      )
      this.xs.forEach((x, i) => {
        chartGrade.push({
          x: this.$units.distf(x),
          y: mbs[i][0] / 10
        })
      })

      // this is a hack to make the finish waypoint show up:
      this.chartOptions.scales.xAxes[0].ticks.max = (
        this.$units.distf(this.xs[this.xs.length - 1]) + 0.01
      )
      this.chartProfile = chartProfile
      this.chartGrade = chartGrade
    },
    transparentize: function (color, opacity) {
      const alpha = opacity === undefined ? 0.5 : 1 - opacity
      return window.Color(color).alpha(alpha).rgbString()
    },
    updateBackgroundRules: function () {
      if (!this.sunEvents.length) { return [] }
      // format distance unit for day/night background:
      this.chartOptions.backgroundRules = this.sunEvents.map(br => {
        const br2 = { ...br }
        br2.loc = this.$units.distf(br2.loc)
        return br2
      })
    },
    update: function () {
      this.$refs.profile.update()
      this.$logger('CourseProfile|update')
    }
  }
}
</script>
