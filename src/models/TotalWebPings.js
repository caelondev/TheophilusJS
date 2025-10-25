/**
 * Created by caelondev
 * Licensed under the GNU AGPLv3
 * See LICENSE for details.
 */

const { Schema, model } = require("mongoose")

const totalWebPingSchema = new Schema({
  count: {
    type: Number,
    default: 0
  }
})

module.exports = model('TotalWebPings', totalWebPingSchema)
