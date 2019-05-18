<template>
  <div>
    <b-modal
      id="course-edit-modal"
      centered
      :static="true"
      v-bind:title="(model._id ? 'Edit Course' : 'New Course')"
      @hidden="clearModal"
      @cancel="clearModal"
      @ok="handleOk"
    >
      <form @submit.prevent="saveCourse">
        <b-form-group label="Name">
          <b-form-input type="text" v-model="model.name"></b-form-input>
        </b-form-group>
        <b-form-group label="Privacy">
          <b-form-checkbox v-model="model.public" value="true" unchecked-value="false">
            Visible to public
          </b-form-checkbox>
        </b-form-group>
        <b-form-group label="Description">
          <b-form-textarea rows="4" v-model="model.description"></b-form-textarea>
        </b-form-group>
        <b-form-group label="GPX File" v-show="!model._id">
          <b-form-file
              :state="Boolean(file)"
              v-model="file"
              placeholder="Choose a GPX file..."
              drop-placeholder="Drop GPX file here..."
              accept=".gpx"
            ></b-form-file>
        </b-form-group>
      </form>
      <template slot="modal-ok" slot-scope="{ ok }">
        <b-spinner v-show="saving" small></b-spinner>
        Save Course
      </template>
    </b-modal>
  </div>
</template>

<script>
import api from '@/api'
export default {
  props: ['course'],
  data () {
    return {
      file: null,
      model: {},
      saving: false
    }
  },
  watch: {
    course: function (val) {
      if (val._id) {
        this.model = Object.assign({}, val)
      } else {
        this.model = {}
      }
      this.$bvModal.show('course-edit-modal')
    }
  },
  methods: {
    handleOk(bvModalEvt) {
      // Prevent modal from closing
      bvModalEvt.preventDefault()
      // Trigger submit handler
      this.saveCourse()
    },
    async saveCourse () {
      this.saving = true
      if (this.model._id) {
        await api.updateCourse(this.model._id, this.model)
      } else {
        const formData = new FormData()
        formData.append('file', this.file)
        formData.append('model', JSON.stringify(this.model))
        await api.createCourse(formData)
      }
      await this.$emit('refresh')
      this.saving = false
      this.clearModal()
      this.$bvModal.hide('course-edit-modal')
    },
    clearModal() {
      this.model = {}
    }
  }
}
</script>