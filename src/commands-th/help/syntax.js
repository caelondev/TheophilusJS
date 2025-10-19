/**
 * Created by caelondev
 * Licensed under the GNU AGPLv3
 * See LICENSE for details.
 */

const config = require("../../../config.json")

const handleSyntax = async (client, message) => {
  try {
    message.reply(`\`${config.botSecondaryPrefix}<command category> <command name> [args | options]\`\n\nExample usage: \`${config.botSecondaryPrefix}help syntax\`\n||(sends this message)||`)
  } catch (error) {
    console.log(error)
  }
};

module.exports = {
  name: "syntax",
  description: `Check "${config.botSecondaryPrefix}" prefixed command syntax`,
  callback: handleSyntax,
};

