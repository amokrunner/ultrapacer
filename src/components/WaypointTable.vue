<template>
  <b-table
    ref="table"
    :items="rows"
    :fields="fields"
    primary-key="_id"
    hover
    selectable
    select-mode="single"
    small
    head-variant="light"
    no-border-collapse
    :class="`mb-0 table-xs${printing ? ' show-all-cells' : ''}`"
    :sticky-header="tableHeight ? tableHeight + 'px' : false"
    @row-clicked="toggleRowDetails"
  >
    <template #cell(actions)="row">
      <b-button
        class="mr-1"
        @click="editFn(getWaypoint(row.item))"
      >
        <v-icon name="edit" />
        <span class="d-none d-xl-inline">Edit</span>
      </b-button>
      <b-button
        v-if="getWaypoint(row.item, 'type') !== 'start' && getWaypoint(row.item, 'type') !== 'finish'"
        class="mr-1"
        @click="delFn(getWaypoint(row.item))"
      >
        <v-icon name="trash" />
        <span class="d-none d-xl-inline">Delete</span>
      </b-button>
    </template>
    <template #row-details="row">
      <b-card>
        <b-row class="mb-2">
          <b-col sm="4">
            Adjust Location:
          </b-col>
          <b-col sm="8">
            <b-button
              v-for="sb in shiftButtons"
              :key="sb.value"
              size="sm"
              class="mr-1"
              variant="outline-primary"
              @click="shiftWaypoint(row.item, sb.value)"
            >
              {{ sb.display }}
            </b-button>
          </b-col>
        </b-row>
      </b-card>
    </template>
  </b-table>
</template>

<script>
import timeUtil from '../util/time'
export default {
  props: {
    course: {
      type: Object,
      required: true
    },
    editing: {
      type: Boolean,
      default: false
    },
    editFn: {
      type: Function,
      required: true
    },
    delFn: {
      type: Function,
      required: true
    },
    printing: {
      type: Boolean,
      default: false
    },
    segments: {
      type: Array,
      required: true
    },
    tableHeight: {
      type: Number,
      default: 0
    }
  },
  data () {
    return {
      detailsId: null,
      shiftButtons: [
        { value: -1, display: '<<<' },
        { value: -0.1, display: '<<' },
        { value: -0.01, display: '<' },
        { value: 0.01, display: '>' },
        { value: 0.1, display: '>>' },
        { value: 1, display: '>>>' }
      ]
    }
  },
  computed: {
    rows: function () {
      if (this.editing) {
        return this.course.waypoints.map(
          wp => {
            return { _id: wp._id, _showDetails: wp._id === this.detailsId }
          }
        )
      } else {
        return this.course.waypoints.filter(x => x.tier < 3).map(wp => { return { _id: wp._id } })
      }
    },
    showTerrainType: function () {
      return this.course.waypoints.findIndex(wp => wp.terrainType) >= 0
    },
    showTerrainFactor: function () {
      return this.course.waypoints.findIndex(wp => wp.terrainFactor) >= 0
    },
    fields: function () {
      const f = [
        {
          key: 'name',
          class: 'text-truncate mw-7rem',
          formatter: (value, key, item) => {
            return this.getWaypoint(item, key)
          }
        },
        {
          key: 'type',
          formatter: (value, key, item) => {
            return this.$waypointTypes[this.getWaypoint(item, key)]
          },
          class: 'd-none d-md-table-cell'
        },
        {
          key: 'location',
          label: `Loc. [${this.$units.dist}]`,
          formatter: (value, key, item) => {
            return this.$units.distf(this.getWaypoint(item, key), 2)
          },
          class: 'text-right'
        },
        {
          key: 'elevation',
          label: `Elev. [${this.$units.alt}]`,
          formatter: (value, key, item) => {
            return this.$units.altf(this.getWaypoint(item, key), 0)
              .replace(/\B(?=(\d{3})+(?!\d))/g, ',')
          },
          class: 'd-none d-sm-table-cell text-right'
        }
      ]
      if (this.showTerrainType && this.editing) {
        f.push({
          key: 'terrainType',
          label: 'Terrain',
          formatter: (value, key, item) => {
            if (this.getWaypoint(item, 'type') === 'finish') { return '' }
            let v = this.getWaypoint(item, key)
            if (v === null) {
              // if waypoint doesn't have a value, show previous
              const i = this.course.waypoints.findIndex(wp => wp._id === item._id)
              const wp = this.course.waypoints.filter((wp, j) =>
                j < i &&
                wp.terrainType
              ).pop()
              v = (wp) ? wp.terrainType : ''
            }
            return v
          },
          class: 'd-none d-lg-table-cell text-right'
        })
      }
      if (this.showTerrainFactor && this.editing) {
        f.push({
          key: 'terrainFactor',
          label: 'Factor',
          formatter: (value, key, item) => {
            if (this.getWaypoint(item, 'type') === 'finish') { return '' }
            let v = this.getWaypoint(item, key)
            if (v === null) {
              // if waypoint doesn't have a value, show previous
              const i = this.course.waypoints.findIndex(wp => wp._id === item._id)
              const wp = this.course.waypoints.filter((wp, j) =>
                j < i &&
                wp.terrainFactor !== null
              ).pop()
              v = (wp) ? wp.terrainFactor : 0
            }
            return `+${v}%`
          },
          class: 'd-none d-lg-table-cell text-center'
        })
      }
      if (this.editing) {
        f.push({
          key: 'actions',
          label: '',
          tdClass: 'actionButtonColumn'
        })
      } else if (this.segments[0].time) {
        f.push({
          key: 'time',
          label: 'Time',
          formatter: (value, key, item) => {
            try {
              if (this.rows.findIndex(r => r._id === item._id) === 0) {
                const s = this.segments[0]
                if (s.tod !== undefined) {
                  return timeUtil.sec2string(s.tod - s.elapsed, 'am/pm')
                } else {
                  return timeUtil.sec2string(0, '[h]:m:ss')
                }
              } else {
                const s = this.segments.find(s => s.waypoint._id === item._id)
                if (s.tod !== undefined) {
                  return timeUtil.sec2string(s.tod, 'am/pm')
                } else {
                  return timeUtil.sec2string(s.elapsed, '[h]:m:ss')
                }
              }
            } catch (err) {
              console.log(err)
              return ''
            }
          },
          class: 'text-right'
        })
      }
      return f
    }
  },
  watch: {
    editing: function (val) {
      // hide details fields when editing is turned off
      if (val === false) {
        this.detailsId = null
        this.rows.forEach(r => {
          this.$set(r, '_showDetails', false)
        })
      }
    }
  },
  methods: {
    getWaypoint: function (row, field = null) {
      // return the waypoint object/field associated with a row
      const wp = this.course.waypoints.find(wp => wp._id === row._id)
      return (field) ? wp[field] : wp
    },
    toggleRowDetails: function (row) {
      if (!this.editing) return
      for (let i = 0, il = this.course.waypoints.length; i < il; i++) {
        if (row !== this.rows[i] && this.rows[i]._showDetails) {
          this.$set(this.rows[i], '_showDetails', false)
        }
      }
      const waypoint = this.getWaypoint(row)
      if (waypoint.type !== 'start' && waypoint.type !== 'finish') {
        this.$set(row, '_showDetails', !row._showDetails)
      }
      this.detailsId = (row._showDetails) ? row._id : null
    },
    shiftWaypoint: function (row, delta) {
      const waypoint = this.getWaypoint(row)
      let loc = waypoint.location + delta / this.$units.distScale
      if (loc < 0.01 / this.$units.distScale) {
        loc = 0.01
      } else if (loc >= this.course.distance) {
        loc = this.course.distance - (0.01 / this.$units.distScale)
      }
      this.$emit('updateWaypointLocation', row._id, loc)
    },
    selectWaypoint: function (id) {
      const i = this.rows.findIndex(x => x._id === id)
      this.$refs.table.selectRow(i)
    }
  }
}
</script>
