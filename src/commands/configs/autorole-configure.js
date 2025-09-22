const {
  Client,
  ChatInputCommandInteraction,
  ApplicationCommandOptionType,
  PermissionFlagsBits,
} = require("discord.js");
const BotConfig = require("../../models/BotConfig");

/**
 * @param {Client} client
 * @param {ChatInputCommandInteraction} interaction
 */
const handleBotConfigureChannel = async (client, interaction) => {
  try {
    // Defer immediately (ephemeral works here)
    await interaction.deferReply({ ephemeral: true });

    const botChannelOpt = interaction.options.getChannel("channel");

    // Fetch or create config
    let botConfig = await BotConfig.findOne({ guildId: interaction.guild.id });
    if (!botConfig) {
      botConfig = new BotConfig({ guildId: interaction.guild.id });
    }

    // Update values
    botConfig.channelId = botChannelOpt.id;
    botConfig.channelName = botChannelOpt.name;

    await botConfig.save();

    // Final response (no flags needed here)
    await interaction.editReply(
      `✅ Successfully set bot's channel to ${botChannelOpt}.`,
    );
  } catch (error) {
    console.error(error);

    // Safe fallback response
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply(
        "❌ An error occurred while configuring the bot's channel. Please try again later...",
      );
    } else {
      await interaction.reply({
        content:
          "❌ An error occurred before I could respond. Please try again later...",
        ephemeral: true,
      });
    }
  }
};

module.exports = {
  name: "bot-channel-configure",
  description: "Configure your bot channel",
  options: [
    {
      name: "channel",
      description:
        "The channel you want to use as a bot channel exclusively for TheophilusJS.",
      type: ApplicationCommandOptionType.Channel,
      required: true,
    },
  ],
  permissionsRequired: [PermissionFlagsBits.Administrator],
  serverSpecific: true,
  debugger: true,
  callback: handleBotConfigureChannel,
};
