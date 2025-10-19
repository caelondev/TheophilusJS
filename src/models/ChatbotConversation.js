/**
 * Created by caelondev
 * Licensed under the GNU AGPLv3
 * See LICENSE for details.
 */

const { Schema, model } = require("mongoose")

const chatbotConversationSchema = new Schema({
  guildId: {
    required: true,
    unique: true,
    type: String,
  },
  conversation: [
    {
      role: {
        type: String,
        enum: ["system", "user", "assistant"], // optional but safer
        required: true,
      },
      content: {
        type: String,
        required: true,
      }
    }
  ]
})

module.exports = model("chatbotConversation", chatbotConversationSchema)
