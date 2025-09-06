const getConfig = require("../../utils/getConfig");
const { devs, testServer } = getConfig();
const { MessageFlags } = require("discord.js")
const getLocalCommands = require("../../utils/getLocalCommands");

module.exports = async (client, interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const localCommands = getLocalCommands();

  try {
    const commandObject = localCommands.find(
      (cmd) => cmd.name === interaction.commandName
    );

    if (!commandObject) return;

    // Developer-only check
    if (commandObject.devOnly && !devs.includes(interaction.member.id)) {
      interaction.reply({
        content: "🚫 Only developers/admins are allowed to run this command.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // Test-server-only check
    if (commandObject.testOnly && interaction.guild.id !== testServer) {
      interaction.reply({
        content: "⚠️ This command cannot be run here.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // User permissions check
    if (commandObject.permissionsRequired?.length) {
      for (const permission of commandObject.permissionsRequired) {
        if (!interaction.member.permissions.has(permission)) {
          interaction.reply({
<<<<<<< HEAD
<<<<<<< HEAD
            content: "❌ Not enough permissions.",
=======
            content: "❌ You don't have enough permissions.",
>>>>>>> cd5f026 (Fixed a typo)
=======
            content: "❌ Yoi don't have enough permissions.",
>>>>>>> 8a768bd (Added banlist and unban command)
            flags: MessageFlags.Ephemeral,
          });
          return;
        }
      }
    }

    // Bot permissions check
    if (commandObject.botPermissions?.length) {
      const bot = interaction.guild.members.me;
      for (const permission of commandObject.botPermissions) {
        if (!bot.permissions.has(permission)) {
          interaction.reply({
            content: "🤖 I don't have enough permissions.",
            flags: MessageFlags.Ephemeral,
          });
          return;
        }
      }
    }

    // Execute command
    await commandObject.callback(client, interaction);
  } catch (error) {
    console.log(`⚠️ There was an error running this command: ${error}`);
  }
};
