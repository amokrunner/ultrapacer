<template>
  <b-table
    ref="table"
    :busy="busy"
    :items="rows"
    :fields="fields"
    primary-key="_index"
    selectable
    select-mode="single"
    hover
    foot-clone
    small
    head-variant="light"
    no-border-collapse
    :class="`mb-0 table-xs${printing ? ' show-all-cells' : ''}`"
    :sticky-header="tableHeight ? tableHeight + 'px' : false"
    @row-clicked="selectRow"
  >
    <template #foot(name)>
      &nbsp;
    </template>
    <template #foot(len)>
      {{ $units.distf(course.distance, 2) }}
    </template>
    <template #foot(end)>
      {{ $units.distf(course.distance, 2) }}
    </template>
    <template #foot(gain)>
      {{ $units.altf(course.gain, 0) | commas }}
    </template>
    <template #foot(loss)>
      {{ $units.altf(course.loss, 0) | commas }}
    </template>
    <template #foot(grade)>
      &nbsp;
    </template>
    <template #foot(time)>
      {{ time }}
    </template>
    <template #foot(elapsed)>
      {{ segments[segments.length - 1].elapsed | formatTime }}
    </template>
    <template #foot(actualElapsed)>
      {{ segments[segments.length - 1].actualElapsed | formatTime }}
    </template>
    <template #foot(tod)>
      {{ sec2string(segments[segments.length - 1].tod, 'am/pm') }}
    </template>
    <template #foot(pace)>
      {{ $units.pacef(plan.pacing.pace) | formatTime }}
    </template>
    <template
      v-if="mode==='segments'"
      #cell(collapse)="row"
    >
      <b-button
        v-if="isCollapsed(row.item)"
        class="collapse-button mr-1"
        @click="expandRow(row.item)"
      >
        &#9660;
      </b-button>
      <b-button
        v-else-if="isCollapseable(row.item)"
        class="collapse-button mr-1"
        @click="collapseRow(row.item)"
      >
        &#9650;
      </b-button>
      <div
        v-else-if="isChild(row.item)"
        style="text-align:center"
      >
        &#8944;
      </div>
    </template>
    <template #row-details="row">
      <b-list-group
        :class="(spannedWaypoints(getSegment(row.item)).length || hasFactors(row.item)) ? 'pt-1' : 'd-md-none pt-1'"
      >
        <b-list-group-item
          :class="`d-${minFieldsSize}-none`"
        >
          <b-row
            v-for="f in fields.filter(f=>Boolean(fieldsInTable[f.key]))"
            :key="f.key"
            :class="`mb-1 d-${fieldsInTable[f.key]}-none`"
          >
            <b-col
              cols="4"
              class="text-right"
            >
              <b>{{ f.label }}:</b>
            </b-col>
            <b-col v-if="f.formatter">
              {{ f.formatter(parseField(row.item, f.key), f.key, row.item) }}
            </b-col>
          </b-row>
        </b-list-group-item>
        <b-list-group-item :class="`d-none d-${minFieldsSize}-block p-0`" />

        <b-list-group-item
          v-for="wp in spannedWaypoints(getSegment(row.item))"
          :key="wp._id"
        >
          <b>{{ wp.name }} ({{ $waypointTypes[wp.type] }}), {{ $units.distf(wp.location, 2) }} {{ $units.dist }}</b><br>
          <b-row v-if="waypointDelay(wp)">
            <b-col
              cols="4"
              class="text-sm-right"
            >
              <b>Delay:</b>
            </b-col>
            <b-col>{{ waypointDelay(wp) / 60 }} minutes</b-col>
          </b-row>
          <b-row v-if="wp.description">
            <b-col
              cols="4"
              class="text-right"
            >
              <b>Notes:</b>
            </b-col>
            <b-col style="white-space:pre-wrap">
              {{ wp.description }}
            </b-col>
          </b-row>
        </b-list-group-item>

        <b-list-group-item
          v-if="hasFactors(row.item)"
        >
          <b>Pacing Factors</b><br>
          <b-row
            v-for="factor in getFactors(row.item)"
            :key="factor.name"
            class="mb-1"
          >
            <b-col
              cols="4"
              class="text-right"
            >
              <b>{{ factorLables[factor.name] }}:</b>
            </b-col>
            <b-col>{{ formatPaceTimePercent(factor.value, row.item) }}</b-col>
          </b-row>
        </b-list-group-item>
      </b-list-group>
    </template>
  </b-table>
</template>

<script>
import timeUtil from '../util/time'
export default {
  filters: {
    formatTime (val) {
      if (!val) { return '' }
      return timeUtil.sec2string(val, '[h]:m:ss')
    }
  },
  props: {
    course: {
      type: Object,
      required: true
    },
    segments: {
      type: Array,
      required: true
    },
    plan: {
      type: Object,
      default () { return null }
    },
    busy: {
      type: Boolean,
      default: false
    },
    mode: {
      type: String,
      required: true
    },
    printing: {
      type: Boolean,
      default: false
    },
    showActual: {
      type: Boolean,
      default: false
    },
    tableHeight: {
      type: Number,
      default: 0
    },
    visible: {
      type: Boolean,
      default: false
    }
  },
  data () {
    return {
      clearing: false,
      visibleTrigger: 0,
      factorLables: { gF: 'Grade', tF: 'Terrain', aF: 'Altitude', hF: 'Heat', dF: 'Drift', dark: 'Darkness' },
      visibleSubWaypoints: []
    }
  },
  computed: {
    rows: function () {
      let arr = this.segments.map((s, i) => { return { _index: i } })
      if (this.mode === 'segments') {
        arr = arr.filter((r, i) =>
          this.segments[i].waypoint.tier === 1 ||
          this.visibleSubWaypoints.findIndex(vi => vi === i) >= 0
        )
      }
      return arr
    },
    planAssigned: function () {
      return Boolean(this.plan && this.plan.pacing && this.plan.pacing.time)
    },
    fieldsInTable: function () {
      // specify fields to show in table or in details based on size breaks
      const fieldsInTable = {
        len: 'sm',
        tod: 'xl'
      }
      if (this.mode === 'segments') {
        fieldsInTable.grade = 'xl'
        fieldsInTable.loss = 'xl'
        if (this.planAssigned) {
          fieldsInTable.gain = 'sm'
          fieldsInTable.time = 'md'
          fieldsInTable.pace = 'sm'
        }
      } else {
        fieldsInTable.grade = 'md'
        if (this.planAssigned) {
          fieldsInTable.loss = 'sm'
        }
      }
      return fieldsInTable
    },
    minFieldsSize: function () {
      // this is the size at which to show hidden columns in the row details
      const a = ['xs', 'sm', 'md', 'lg', 'xl']
      let i = 0
      Object.keys(this.fieldsInTable).forEach(k => {
        const fieldExists = this.fields.findIndex(f => f.key === k) >= 0
        if (fieldExists) {
          i = Math.max(i, a.findIndex(x => x === this.fieldsInTable[k]))
        }
      })
      return a[i]
    },
    fields: function () {
      const f = [
        {
          key: 'end',
          label: 'Dist [' + this.$units.dist + ']',
          formatter: (value, key, item) => {
            return this.$units.distf(this.rollup(item, key, 'last'), 2)
          }
        },
        {
          key: 'gain',
          label: `Gain [${this.$units.alt}]`,
          formatter: (value, key, item) => {
            const scale = this.course.scales ? this.course.scales.gain : 1
            return this.$units.altf(this.rollup(item, key, 'sum') * scale, 0)
              .replace(/\B(?=(\d{3})+(?!\d))/g, ',')
          }
        },
        {
          key: 'loss',
          label: 'Loss [' + this.$units.alt + ']',
          formatter: (value, key, item) => {
            const scale = this.course.scales ? this.course.scales.loss : 1
            return this.$units.altf(this.rollup(item, key, 'sum') * scale, 0)
              .replace(/\B(?=(\d{3})+(?!\d))/g, ',')
          }
        },
        {
          key: 'grade',
          label: 'Grade',
          formatter: (value, key, item) => {
            const gs = this.course.scales ? this.course.scales.gain : 1
            const ls = this.course.scales ? this.course.scales.loss : 1
            const l = this.mode === 'segments'
              ? this.rollup(item, 'len', 'sum')
              : 1 / this.$units.distScale
            const g = (this.rollup(item, 'gain', 'sum') * gs + this.rollup(item, 'loss', 'sum') * ls) / l / 10
            return (g).toFixed(1) + '%'
          }
        }
      ]
      if (this.mode === 'segments') {
        f.splice(1, 0, {
          key: 'len',
          label: 'Len [' + this.$units.dist + ']',
          formatter: (value, key, item) => {
            return this.$units.distf(this.rollup(item, key, 'sum'), 2)
          }
        })
        f.unshift({
          key: 'name',
          label: 'End',
          class: 'text-truncate mw-7rem',
          formatter: (value, key, item) => {
            return this.rollup(item, 'waypoint.name', 'last')
          }
        })
      }
      if (this.planAssigned) {
        if (this.mode === 'segments') {
          f.push({
            key: 'time',
            label: 'Time',
            formatter: (value, key, item) => {
              return timeUtil.sec2string(this.rollup(item, key, 'sum'), '[h]:m:ss')
            }
          })
        }
        f.push({
          key: 'pace',
          label: `Pace [/${this.$units.dist}]`,
          formatter: (value, key, item) => {
            const l = this.$units.distf(this.rollup(item, 'len', 'sum'))
            return timeUtil.sec2string(this.rollup(item, 'time', 'sum') / l, '[h]:m:ss')
          }
        })
        f.push({
          key: 'elapsed',
          label: 'Elapsed',
          formatter: (value, key, item) => {
            return timeUtil.sec2string(this.rollup(item, key, 'last'), '[h]:m:ss')
          }
        })
        if (this.showActual) {
          f.push({
            key: 'actualElapsed',
            label: 'Actual',
            formatter: (value, key, item) => {
              return timeUtil.sec2string(this.rollup(item, key, 'last'), '[h]:m:ss')
            },
            variant: 'success'
          })
        }
        if (this.showClock) {
          f.push({
            key: 'tod',
            label: 'Arrival',
            formatter: (value, key, item) => {
              return timeUtil.sec2string(this.rollup(item, key, 'last'), 'am/pm')
            }
          })
        }
      }
      f.forEach((x, i) => {
        f[i].thClass = this.getClass(x.key)
        f[i].tdClass = f[i].thClass
      })
      if (
        !this.printing &&
        this.mode === 'segments' &&
        this.course.waypoints.findIndex(x => x.tier > 1) >= 0) {
        f.push({
          key: 'collapse',
          label: '',
          tdClass: 'actionButtonColumn text-center'
        })
      }
      return f
    },
    time: function () {
      const t = this.segments.reduce((t, x) => { return t + x.time }, 0)
      return timeUtil.sec2string(t, '[h]:m:ss')
    },
    actualMovingTime: function () {
      if (this.showActual) {
        const t = this.segments.reduce((t, x) => { return t + x.actualElapsed }, 0)
        return timeUtil.sec2string(t, '[h]:m:ss')
      } else {
        return 0
      }
    },
    showClock: function () {
      return this.segments[0].tod !== undefined
    },
    collapseableIds: function () {
      return this.segments.filter((s, i) =>
        i > 0 &&
        this.segments[i - 1].waypoint.tier === 1 &&
        s.waypoint.tier > 1
      ).map(s => { return s.waypoint._id })
    }
  },
  watch: {
    segments: function (val) {
      this.visibleSubWaypoints = []
    },
    visible: function (val) {
      if (!val) {
        this.clear()
      }
    }
  },
  methods: {
    getSegment: function (row, field = null) {
      // return the segment object/field associated with a row
      const s = this.segments[row._index]
      return (field) ? this.parseField(s, field) : s
    },
    getFactors: function (row) {
      const fs = []
      Object.keys(this.factorLables).forEach(k => {
        const f = this.rollup(row, `factors.${k}`, 'weightedAvg')
        if (this.$math.round(f, 4) !== 1) {
          fs.push({
            name: k,
            value: f
          })
        }
      })
      return fs
    },
    getClass: function (key) {
      // return class of cell in table for each key
      const lefts = ['name']
      const base = lefts.includes(key) ? '' : 'text-right'
      if (this.fieldsInTable[key]) {
        return `d-none d-${this.fieldsInTable[key]}-table-cell ${base}`
      } else {
        return base
      }
    },
    isCollapsed: function (row) {
      const ri = this.rows.findIndex(r => r._index === row._index)
      return ((ri === 0 && row._index > 0) || (ri > 0 && row._index - this.rows[ri - 1]._index > 1))
    },
    isCollapseable: function (row) {
      // return whether to show the collapse row button
      if (this.segments[row._index].waypoint.tier !== 1) return false
      const last1 = this.segments.filter((s, i) => i < row._index && s.waypoint.tier === 1).pop()
      const last2 = this.segments.filter((s, i) => i < row._index && s.waypoint.tier === 2).pop()
      return (last2 !== undefined) && (last1 === undefined || last2.waypoint.location > last1.waypoint.location)
    },
    isChild: function (row) {
      return this.segments[row._index].waypoint.tier === 2
    },
    clear: async function () {
      this.clearing = true
      await this.$refs.table.clearSelected()
      this.rows.filter(r => r._showDetails)
        .forEach(r => { this.$set(r, '_showDetails', false) })
      this.clearing = false
    },
    expandRow: function (row) {
      const ri = this.rows.findIndex(r => r._index === row._index)
      const prev = (ri > 0) ? this.rows[ri - 1]._index : -1
      const wps = []
      this.segments.forEach((s, i) => {
        if (i > prev && i < row._index) {
          this.visibleSubWaypoints.push(i)
          wps.push(s.waypoint._id)
        }
      })
      this.$emit('show', wps)
      this.$emit('select', this.mode, [])
    },
    collapseRow: function (row) {
      let prev
      for (prev = row._index - 1; prev >= 0; prev--) {
        if (prev < 0) { break } else if (this.segments[prev].waypoint.tier === 1) { break }
      }
      const wps = []
      this.segments.forEach((s, i) => {
        if (i > prev && i < row._index) {
          this.visibleSubWaypoints = this.visibleSubWaypoints.filter(vi => vi !== i)
          wps.push(s.waypoint._id)
        }
      })
      this.$emit('hide', wps)
      this.$emit('select', this.mode, [])
    },
    selectRow: function (row) {
      this.rows.filter((r, i) => r._index !== row._index).forEach(r => {
        this.$set(r, '_showDetails', false)
      })
      this.$set(row, '_showDetails', !row._showDetails)
      const len = this.mode === 'segments'
        ? this.rollup(row, 'len', 'sum')
        : 1 / this.$units.distScale
      this.$emit(
        'select',
        this.mode,
        [this.getSegment(row, 'end') - len, this.getSegment(row, 'end')]
      )
      if (!row._showDetails) {
        this.$emit('select', this.mode, [])
      }
    },
    rollup: function (row, field, method) {
      const ri = this.rows.findIndex(r => r._index === row._index)
      if (
        this.mode === 'segments' &&
        ((ri === 0 && row._index > 0) ||
        (ri > 0 && row._index - this.rows[ri - 1]._index > 1))
      ) {
        const prev = (ri > 0) ? this.rows[ri - 1]._index : -1
        const subs = this.segments.filter((s, i) => i > prev && i <= row._index)
        switch (method) {
          case 'sum': {
            return subs.reduce((v, x) => { return v + this.parseField(x, field) }, 0)
          }
          case 'first': {
            return this.parseField(subs[0], field)
          }
          case 'last': {
            return this.parseField(subs[subs.length - 1], field)
          }
          case 'weightedAvg': {
            let v = 0
            let t = 0
            subs.forEach(s => {
              v += s.len * this.parseField(s, field)
              t += s.len
            })
            return v / t
          }
        }
      } else {
        return this.getSegment(row, field)
      }
    },
    parseField: function (obj, field) {
      const arr = field.split('.')
      switch (arr.length) {
        case 1:
          return obj[field]
        case 2:
          return obj[arr[0]][arr[1]]
      }
    },
    sec2string: function (s, f) {
      return timeUtil.sec2string(s, f)
    },
    spannedWaypoints: function (s) {
      return this.course.waypoints.filter(wp =>
        this.$math.round(wp.location, 4) > this.$math.round(s.end - s.len, 4) &&
        this.$math.round(wp.location, 4) <= this.$math.round(s.end, 4) && (
          wp.description ||
        this.waypointDelay(wp))
      )
    },
    waypointDelay: function (wp) {
      if (!this.planAssigned || !this.plan.pacing.delays.length) return 0
      const d = this.plan.pacing.delays.find(d =>
        this.$math.round(d.loc, 4) === this.$math.round(wp.location, 4)
      )
      return (d) ? d.delay : 0
    },
    formatPaceTimePercent (f, item) {
      const df = f - 1
      const sign = f - 1 > 0 ? '+' : '-'
      let str = `${sign}${(Math.abs(df) * 100).toFixed(1)}%`
      if (this.planAssigned) {
        const time = this.rollup(item, 'time', 'sum')
        const len = this.rollup(item, 'len', 'sum')
        const pace = time / len
        const dTime = Math.abs(time * (1 - 1 / f))
        const dPace = Math.abs(pace * (1 - 1 / f) / this.$units.distScale)
        const paceStr = `[${sign}${timeUtil.sec2string(dPace, '[h]:m:ss')}/${this.$units.dist}] `
        str = `${sign}${timeUtil.sec2string(dTime, '[h]:m:ss')} ${paceStr}[${str}]`
      }
      return str
    },
    hasFactors (item) {
      const segment = this.getSegment(item)
      let res = false
      Object.keys(segment.factors).forEach(k => {
        if (this.$math.round(segment.factors[k], 4) !== 1) {
          res = true
        }
      })
      return res
    }
  }
}
</script>
