const { Schema, model } = require("mongoose")

const userSchema = new Schema({
  userId: {
    type: String,
    required: true
  },
  guildId: {
    type: String,
    required: true
  },
  balance: {
    type: Number,
    default: 0
  },
  lastDaily: {
    type: Date,
  },
  lastSteal: {
    type: Date,
    default: null,
  },
  stealChancesLeft: {
    default: 5,
    type: Number
  }
})

module.exports = model('User', userSchema)
