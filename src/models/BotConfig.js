/**
 * Created by caelondev
 * Licensed under the GNU AGPLv3
 * See LICENSE for details.
 */

const { Schema, model } = require("mongoose");

const botConfigSchema = new Schema({
  guildId: {
    type: String,
    required: true,
  },
  channelId: {
    type: String,
  },
  channelName: {
    type: String,
    default: "", // will be filled at runtime if empty
  },
  autoMessagesEnabled: {
    type: Boolean,
    default: true
  },
});

module.exports = model("BotConfig", botConfigSchema);
