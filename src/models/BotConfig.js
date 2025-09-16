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
});

module.exports = model("BotConfig", botConfigSchema);
