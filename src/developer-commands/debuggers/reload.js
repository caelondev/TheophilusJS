const path = require("path");
const getLocalCommands = require("../../utils/getLocalCommands");
const getLocalDeveloperCommands = require("../../utils/getLocalDeveloperCommands");

module.exports = {
  name: "reload",
  description: "Reload all slash and developer commands",
  callback: async (client, message, args) => {
    try {
      // If no args → reload everything
      if (args.length === 0) {
        // 🧹 Clear cached slash commands
        const slashPath = path.join(__dirname, "../../commands");
        Object.keys(require.cache).forEach((file) => {
          if (file.startsWith(slashPath)) delete require.cache[file];
        });

        // 🧹 Clear cached dev commands
        const devPath = path.join(__dirname, "../");
        Object.keys(require.cache).forEach((file) => {
          if (file.startsWith(devPath)) delete require.cache[file];
        });

        // ♻️ Reload both
        client.slashCommands = getLocalCommands();
        client.devCommands = getLocalDeveloperCommands();

        return message.reply("♻️ Reloaded **all slash + dev commands**.");
      }

      // If arg given → reload specific command
      const target = args[0].toLowerCase();

      try {
        // Try slash command first
        const slashPath = path.join(__dirname, `../../commands/${target}.js`);
        delete require.cache[require.resolve(slashPath)];
        const newSlash = require(slashPath);

        const slashCommands = client.slashCommands || [];
        const index = slashCommands.findIndex((c) => c.name === target);
        if (index !== -1) slashCommands[index] = newSlash;
        else slashCommands.push(newSlash);

        client.slashCommands = slashCommands;
        return message.reply(`♻️ Reloaded slash command **${target}**.`);
      } catch (e1) {
        try {
          // Try developer command
          const devPath = path.join(__dirname, `${target}.js`);
          delete require.cache[require.resolve(devPath)];
          const newDev = require(devPath);

          const devCommands = client.devCommands || [];
          const index = devCommands.findIndex((c) => c.name === target);
          if (index !== -1) devCommands[index] = newDev;
          else devCommands.push(newDev);

          client.devCommands = devCommands;
          return message.reply(`♻️ Reloaded dev command **${target}**.`);
        } catch (e2) {
          return message.reply(`❌ Command **${target}** not found in slash or dev commands.`);
        }
      }
    } catch (err) {
      console.error(err);
      return message.reply(`❌ Failed to reload: ${err.message}`);
    }
  },
};
