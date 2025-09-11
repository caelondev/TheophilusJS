const getConfig = require("../../utils/getConfig");
const { devs, testServers } = getConfig();
const { MessageFlags } = require("discord.js");
const getLocalCommands = require("../../utils/getLocalCommands");
const BotConfig = require("../../models/BotConfig");

module.exports = async (client, interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const localCommands = getLocalCommands();

  try {
    const commandObject = localCommands.find(
      (cmd) => cmd.name === interaction.commandName,
    );

    if (!commandObject) return;

    const botConfig = await BotConfig.findOne({ guildId: interaction.guild.id });

    // ✅ Bot channel restriction check
    if (botConfig && interaction.channel.id !== botConfig.channelId) {
      const botChannel = interaction.guild.channels.cache.get(botConfig.channelId);
      return interaction.reply({
        content: `⚠️ Invalid channel! Please use this command in ${botChannel} 🔗`,
        ephemeral: true, // only the user sees this
      });
    }

    // 👨‍💻 Developer-only check
    if (commandObject.devOnly && !devs.includes(interaction.member.id)) {
      interaction.reply({
        content: "🚫 Only developers/admins are allowed to run this command.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // 🏢 Server-only check
    if (commandObject.serverSpecific) {
      if (!interaction.inGuild()) {
        interaction.reply({
          content: "❌ This command can only be used in a server.",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
    }

    // 🧪 Test-server-only check
    if (commandObject.testOnly) {
      const guildId = interaction.guild?.id;
      if (!guildId || !testServers.includes(guildId)) {
        interaction.reply({
          content: "⚠️ This command can only be run in the test servers.",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
    }

    // 🛡️ User permissions check
    if (commandObject.permissionsRequired?.length) {
      for (const permission of commandObject.permissionsRequired) {
        if (!interaction.member.permissions.has(permission)) {
          interaction.reply({
            content: "❌ You don't have enough permissions.",
            flags: MessageFlags.Ephemeral,
          });
          return;
        }
      }
    }

    // 🤖 Bot permissions check
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

    // 🚀 Execute command
    await commandObject.callback(client, interaction);
  } catch (error) {
    console.log(`⚠️ There was an error running this command: ${error}`);
  }
};
