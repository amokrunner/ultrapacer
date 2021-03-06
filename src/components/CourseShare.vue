<template>
  <div>
    <b-modal
      ref="modal"
      centered
      ok-only
    >
      <template #modal-title>
        Share your {{ type | capitalize }}
      </template>
      <div v-if="course.public && manualShare">
        <p>Copy and paste this URL to share this {{ type }}:</p>
        <p>{{ url }}</p>
      </div>
      <div v-else>
        To enable sharing, you must make this course publicly visible:
        <b-button
          class="mt-2 mb-2"
          variant="success"
          @click.prevent="setPublic()"
        >
          Make Course Public
        </b-button>
      </div>
    </b-modal>
  </div>
</template>

<script>
import api from '@/api'
export default {
  filters: {
    capitalize: function (value) {
      if (!value) return ''
      value = value.toString()
      return value.charAt(0).toUpperCase() + value.slice(1)
    }
  },
  props: {
    course: {
      type: Object,
      required: true
    },
    plan: {
      type: Object,
      required: true
    }
  },
  data () {
    return {
      manualShare: false,
      type: '',
      name: ''
    }
  },
  methods: {
    async init (type = 'course') {
      this.manualShare = false
      this.name = ''
      this.type = type
      if (this.course.public) {
        this.share()
      } else {
        this.$nextTick(() => {
          this.$refs.modal.show()
        })
      }
    },
    async share () {
      this.name = this.course.name
      if (this.type === 'plan') {
        this.name = `${this.name}: ${this.plan.name}`
      }

      const route = {
        name: 'Course',
        params: {
          course: this.course._id
        }
      }
      if (this.type === 'course' && this.course.link) {
        route.name = 'Race'
        route.params.permalink = this.course.link
      } else if (this.type === 'plan') {
        route.name = 'Plan'
        route.params.plan = this.plan._id
      }
      const path = this.$router.resolve(route).href
      this.url = `https://ultrapacer.com${path}`

      if (navigator.share) {
        navigator.share({
          title: `ultraPacer | ${this.name}`,
          text: `ultraPacer | ${this.name}`,
          url: this.url
        }).then(() => {
          this.$gtage(this.$gtag, 'Course', 'share', this.course.name)
        })
          .catch(console.error)
      } else {
        this.manualShare = true
        this.$nextTick(() => {
          this.$refs.modal.show()
        })
      }
    },
    async setPublic () {
      this.$status.processing = true
      this.$refs.modal.hide()
      await api.updateCourse(this.course._id, { public: true })
      const isPublic = await api.getCourseField(this.course._id, 'public')
      if (isPublic) {
        this.$emit('setPublic')
        this.share()
      }
      this.$status.processing = false
    }
  }
}
</script>
