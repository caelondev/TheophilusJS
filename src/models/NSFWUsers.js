/**
 * Created by caelondev
 * Licensed under the GNU AGPLv3
 * See LICENSE for details.
 */

const { Schema, model } = require("mongoose")

const NSFWUsersSchema = new Schema({
  guildId: {
    type: String,
    required: true
  },
  listedUsers: {
    type: [String],
    required: true
  }
})

module.exports = model("NSFWUsers", NSFWUsersSchema)

