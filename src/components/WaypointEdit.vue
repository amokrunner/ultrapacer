<template>
  <div>
    <b-modal
      id="waypoint-edit-modal"
      centered
      :static="true"
      v-bind:title="(model._id ? 'Edit' : 'New') + ' Waypoint'"
      @hidden="clear"
      @cancel="clear"
      @ok="handleOk"
    >
      <form ref="waypointform" @submit.prevent="">
        <b-form-group label="Name">
          <b-form-input type="text" v-model="model.name" required></b-form-input>
        </b-form-group>
        <b-form-group v-bind:label="'Location [' + units.dist + ']'" v-show="model.type != 'start' && model.type != 'finish'">
          <b-form-input type="number" step="0.01" v-model="model.locUserUnit" min="0.01" v-bind:max="locationMax" required></b-form-input>
        </b-form-group>
        <b-form-group label="Type">
          <b-form-select type="number" v-model="model.type" :options="waypointTypes"></b-form-select>
        </b-form-group>
        <b-form-group label="Description">
          <b-form-textarea rows="4" v-model="model.description"></b-form-textarea>
        </b-form-group>
      </form>
      <template slot="modal-ok" slot-scope="{ ok }">
        <b-spinner v-show="saving" small></b-spinner>
        Save Waypoint
      </template>
    </b-modal>
  </div>
</template>

<script>
import api from '@/api'
import wputil from '../../shared/waypointUtilities'
export default {
  props: ['waypoint', 'course', 'points', 'units'],
  data () {
    return {
      model: {},
      saving: false,
      defaults: {
        type: 'aid'
      }
    }
  },
  watch: {
    waypoint: function (val) {
      if (val._id) {
        this.model = Object.assign({}, val)
      } else {
        this.model = Object.assign({}, this.defaults)
      }
      this.model.locUserUnit = (this.model.location * this.units.distScale).toFixed(2)
      this.$bvModal.show('waypoint-edit-modal')
    }
  },
  computed: {
    locationMax: function () {
      return Number((this.course.distance * this.units.distScale).toFixed(2)) - 0.01
    },
    waypointTypes: function () {
      if (this.model.type === 'start') {
        return [{ value: 'start', text: 'Start' }]
      } else if (this.model.type === 'finish') {
        return [{ value: 'finish', text: 'Finish' }]
      } else {
        return [
          { value: 'aid', text: 'Aid Station' },
          { value: 'landmark', text: 'Landmark' }
        ]
      }
    }
  },
  methods: {
    handleOk (bvModalEvt) {
      bvModalEvt.preventDefault()
      if (this.$refs.waypointform.reportValidity()) {
        this.save()
      }
    },
    async save () {
      if (this.saving) { return }
      this.saving = true
      this.model.location = this.model.locUserUnit / this.units.distScale
      wputil.updateLLA(this.model, this.points)
      if (this.model._id) {
        await api.updateWaypoint(this.model._id, this.model)
      } else {
        this.model._course = this.course._id
        await api.createWaypoint(this.model)
      }
      await this.$emit('refresh')
      this.saving = false
      this.clear()
      this.$bvModal.hide('waypoint-edit-modal')
    },
    clear () {
      this.model = Object.assign({}, this.defaults)
    }
  }
}
</script>