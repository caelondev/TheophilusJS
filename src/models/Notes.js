/**
 * Created by caelondev
 * Licensed under the GNU AGPLv3
 * See LICENSE for details.
 */

const { Schema, model } = require("mongoose")

const notesFormat = new Schema({
  title: String,
  note: String
})

const notesSchema = new Schema({
  userId: {
    type: String,
    required: true
  },
  guildId: {
    type: String,
    required: true
  },
  notes: {
    type: [notesFormat],
    default: []
  }
})

module.exports = model('Notes', notesSchema)

