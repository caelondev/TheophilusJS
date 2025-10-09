const config = require("../../../config.json");
const loadedThCommands = require("../../handlers/loadThCommands");

const cooldowns = new Set();

module.exports = async (client, message) => {
  const prefix = config.botSecondaryPrefix;
  const content = message.content.trim();

  if (!content.startsWith(prefix)) return;

  try {
    if (message.author.bot) return;
    if (cooldowns.has(message.author.id)) return;

    const rawInput = content.slice(prefix.length).trim();
    const tokens = rawInput.split(/\s+/).filter((t) => t.length > 0);

    tokens.forEach((token) => {
      token = token.trim();
    });

    if (tokens.length < 2) {
      return message.reply(
        `Syntax error. You need at least 2 tokens in your request. Type \`${prefix}help syntax\` for valid syntax information or \`${prefix}help list\` to guide you to the commands.`,
      );
    }

    const command = {
      category: tokens[0],
      name: tokens[1],
      args: tokens.slice(2),
    };

    if (command.category === "dev") {
      if (!config.devs.includes(message.author.id)) return;
    }

    const loadedCommands = loadedThCommands.loadedCommands;

    if (!(command.category in loadedCommands)) {
      return message.reply(
        `The category \`${command.category}\` does not exist.`,
      );
    }

    const loadedCommandCategory = loadedCommands[command.category];
    let foundCommand = null;

    for (const filePath of loadedCommandCategory) {
      const cmd = require(filePath);

      if (
        cmd &&
        cmd.name &&
        cmd.name.toLowerCase() === command.name.toLowerCase()
      ) {
        foundCommand = cmd;
        break;
      }
    }

    if (!foundCommand) {
      return message.reply(
        `The command \`${command.name}\` in \`${command.category}\` category does not exist.`,
      );
    }

    if ("options" in foundCommand) {
      const options = foundCommand.options;
      const requiredArgs = options.filter((o) => o.required);
      const isMultiOpt = foundCommand.multiOpt === true;

      if (!isMultiOpt && command.args.length > options.length) {
        return message.reply(
          `Too many arguments. Required: ${options.length}. Received: ${command.args.length}`,
        );
      }

      if (requiredArgs.length > command.args.length) {
        return message.reply(
          `Too few arguments. Required: ${requiredArgs.length}. Received: ${command.args.length}`,
        );
      }

      for (let i = 0; i < options.length; i++) {
        options[i].value = command.args[i];
      }

      if (isMultiOpt && command.args.length > options.length) {
        options.push({
          name: "rest",
          value: command.args.slice(options.length),
        });
      }
    }

    foundCommand.callback(client, message);
  } catch (e) {
    console.error(e);
    message.reply(`An error occurred whilst parsing your command.`);
  }
};
