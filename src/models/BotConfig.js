const { Schema, model } = require("mongoose");

const botConfigSchema = new Schema({
  guildId: {
    type: String,
    required: true,
  },
  channelId: {
    type: String,
    required: true
  },
  channelName: {
    type: String,
    required: true,
    default: "", // will be filled at runtime if empty
  },
});

module.exports = model("BotConfig", botConfigSchema);
