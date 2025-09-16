const {
  Client,
  Interaction,
  ApplicationCommandOptionType,
  MessageFlags,
  PermissionFlagsBits,
} = require("discord.js");
const BotConfig = require("../../models/BotConfig");

/**
 * @param {Client} client
 * @param {Interaction} interaction
 */
const handleBotConfigureChannel = async (client, interaction) => {
  // Always defer immediately to avoid "application didn't respond"
  await interaction.deferReply();

  const botChannelOpt = interaction.options.getChannel("channel");

  try {
    // Fetch or create config
    let botConfig = await BotConfig.findOne({ guildId: interaction.guild.id });
    if (!botConfig) {
      botConfig = new BotConfig({ guildId: interaction.guild.id });
    }

    // Update values
    botConfig.channelId = botChannelOpt.id;
    botConfig.channelName = botChannelOpt.name;

    // Save
    await botConfig.save();

    // Edit reply after everything succeeds
    await interaction.editReply({
      content: `✅ Successfully set bot's channel to ${botChannelOpt}.`,
      flags: MessageFlags.Ephemeral,
    });
  } catch (error) {
    console.error(error);

    // Update with error message
    await interaction.editReply({
      content: `❌ An error occurred while configuring the bot's channel. Please try again later...`,
      flags: MessageFlags.Ephemeral,
    });
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
  // ⚠️ Typo fix: should be Administrator, not Adminstrator
  permissionsRequired: [PermissionFlagsBits.Administrator],
  serverSpecific: true,
  debugger: true,
  callback: handleBotConfigureChannel,
};
