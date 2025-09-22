const getConfig = require("../../utils/getConfig");
const { devs, testServers } = getConfig();
const { MessageFlags } = require("discord.js");
const getLocalCommands = require("../../utils/getLocalCommands");
const BotConfig = require("../../models/BotConfig");

const cooldown = new Set()

module.exports = async (client, interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const localCommands = getLocalCommands();

  try {
    const commandObject = localCommands.find(
      (cmd) => cmd.name === interaction.commandName,
    );

    if (!commandObject) return;

    const botConfig = await BotConfig.findOne({
      guildId: interaction.guild.id,
    });


    if(cooldown.has(interaction.user.id) && !commandObject.testOnly) return interaction.reply({
      content: "You're on cooldown! Please wait a few seconds before using this command again.",
      flags: MessageFlags.Ephemeral
    })

    // ✅ Bot channel restriction check
    if (botConfig && interaction.channel.id !== botConfig.channelId && !commandObject.debugger) {
      const botChannel = interaction.guild.channels.cache.get(
        botConfig.channelId,
      );

      if (!botChannel) {
        const isAdmin = interaction.member.permissions.has("Administrator");
        const errorMsg = isAdmin
          ? `⚠️ Bot channel is not configured nor found! Use \`/bot-channel-configure\` to set it up.`
          : `⚠️ Bot channel is not configured nor found! Please notify a server admin to run \`/bot-channel-configure\`.`;

        return interaction.reply({
          content: errorMsg,
          flags: MessageFlags.Ephemeral,
        });
      }
      return interaction.reply({
        content: `⚠️ Invalid channel! Please use this command in ${botChannel} 🔗`,
        flags: MessageFlags.Ephemeral,
      });
    }

    // 👨‍💻 Developer-only check
    if (commandObject.devOnly && !devs.includes(interaction.member.id)) {
      return interaction.reply({
        content: "🚫 Only developers/admins are allowed to run this command.",
        flags: MessageFlags.Ephemeral,
      });
    }

    // 🏢 Server-only check
    if (commandObject.serverSpecific && !interaction.inGuild()) {
      return interaction.reply({
        content: "❌ This command can only be used in a server.",
        flags: MessageFlags.Ephemeral,
      });
    }

    // 🧪 Test-server-only check
    if (commandObject.testOnly) {
      const guildId = interaction.guild?.id;
      if (!guildId || !testServers.includes(guildId)) {
        return interaction.reply({
          content: "⚠️ This command can only be run in the test servers.",
          flags: MessageFlags.Ephemeral,
        });
      }
    }

    // 🛡️ User permissions check
    if (commandObject.permissionsRequired?.length) {
      for (const permission of commandObject.permissionsRequired) {
        if (!interaction.member.permissions.has(permission)) {
          return interaction.reply({
            content: "❌ You don't have enough permissions.",
            flags: MessageFlags.Ephemeral,
          });
        }
      }
    }

    // 🤖 Bot permissions check
    if (commandObject.botPermissions?.length) {
      const bot = interaction.guild.members.me;
      for (const permission of commandObject.botPermissions) {
        if (!bot.permissions.has(permission)) {
          return interaction.reply({
            content: "🤖 I don't have enough permissions.",
            flags: MessageFlags.Ephemeral,
          });
        }
      }
    }

    await commandObject.callback(client, interaction);
    cooldown.add(interaction.user.id)

    setTimeout(()=>{cooldown.delete(interaction.user.id)}, commandObject?.cooldown || 0)
  } catch (error) {
    console.log(`⚠️ There was an error running this command: ${error}`);
  }
}; 
