/**
 * Created by caelondev
 * Licensed under the GNU AGPLv3
 * See LICENSE for details.
 */

const { Schema, model } = require("mongoose")

const levelSchema = new Schema({
  userId: {
    type: String,
    required: true
  },
  username: {
    type: String,
    reqyired: true
  },
  guildId: {
    type: String,
    require: true
  },
  xp: {
    type: Number,
    default: 0
  },
  level: {
    type: Number,
    default: 0
  }
})

module.exports = model('Level', levelSchema)
