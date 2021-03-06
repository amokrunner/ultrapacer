import axios from 'axios'
import { logger } from '../core/logger'

const client = axios.create({
  json: true
})
const host = window.location.origin.includes('localhost') ? '' : 'https://ultrapacer.com'
export default {
  async execute (method, resource, data) {
    const t = logger(`api|execute|${method}|${resource} initiated`)
    return client({
      method,
      url: resource,
      data
    }).then(req => {
      logger(`api|execute|${method}|${resource}`, t)
      return req.data
    })
  },
  async getUpTable (id, type) {
    return this.execute('get', `${host}/api/external/up-table/${id}/${type}`)
  }
}
