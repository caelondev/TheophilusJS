/**
 * Created by caelondev
 * Licensed under the GNU AGPLv3
 * See LICENSE for details.
 */

const { Schema, model } = require("mongoose");

const filteredWordSchema = {
  guildId: {
    type: String,
    required: true,
  },
  filteredWords: {
    type: [String],
  },
};

module.exports = model("FilteredWords", filteredWordSchema);
