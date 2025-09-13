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
 * */
const handleBotConfigureChannel = async (client, interaction) => {
  const botChannelOpt = interaction.options.getChannel("channel");

  try {
    let botConfig = await BotConfig.findOne({ guildId: interaction.guild.id });

    if (!botConfig) {
      botConfig = new BotConfig({ guildId: interaction.guild.id });
    }

    botConfig.channelId = botChannelOpt.id;
    botConfig.channelName = botChannelOpt.name;

    await botConfig.save();

    interaction.reply({
      content: `Successfully set bot's channel to ${botChannelOpt}.`,
      flags: MessageFlags.Ephemeral,
    });
  } catch (error) {
    interaction.reply({
      content: `An error occured whilst configuring bot's channel. Please try again later...`,
      flags: MessageFlags.Ephemeral,
    });
    console.error(error);
  }
};

module.exports = {
  name: `bot-channel-configure`,
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
  permissionsRequired: [PermissionFlagsBits.Adminstrator],
  serverSpecific: true,
  debugger: true,
  callback: handleBotConfigureChannel,
};
