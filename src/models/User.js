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

    required: true
  },
  lastSteal: {
    type: Date,
    default: null,
    required: true
  },
  stealChancesLeft: {
    default: 5,
    type: Number
  }
})

module.exports = model('User', userSchema)
