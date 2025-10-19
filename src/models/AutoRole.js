/**
 * Created by caelondev
 * Licensed under the GNU AGPLv3
 * See LICENSE for details.
 */

const { Schema, model } = require("mongoose")

const autoRoleSchema = new Schema({
  guildId: {
    type: String,
    required: true,
    unique: true
  },
  roleId: {
    type: String,
    required: true,
  }
})

module.exports = model("AutoRole", autoRoleSchema)
