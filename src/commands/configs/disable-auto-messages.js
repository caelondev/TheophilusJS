/**
 * Created by caelondev
 * Licensed under the GNU AGPLv3
 * See LICENSE for details.
 */

const BotConfig = require("../../models/BotConfig");
const { Client, Interaction, EmbedBuilder } = require("discord.js");

/**
 * @param {Client} client
 * @param {Interaction} interaction
 * */
const handleDisableAutoMessages = async (client, interaction) => {
  const autoMessageEmbed = new EmbedBuilder()
    .setColor("Blurple")
    .setTimestamp()
    .setFooter({
      text: `Disabled by ${interaction.user.displayName}`,
      iconURL: interaction.user.avatarURL(),
    });
  try {
    await interaction.deferReply();
    const botConfig = await BotConfig.findOne({
      guildId: interaction.guild.id,
    });

    if (!botConfig)
      botConfig = await new BotConfig({ guildId: interaction.guild.id });
    if (!botConfig.autoMessagesEnabled) {
      autoMessageEmbed.setDescription("Auto-message is already disabled");
      return autoMessagesEmbed.setDescription({ embeds: [autoMessageEmbed] }).setColor("Red");
    }

    botConfig.autoMessagesEnabled = false;
    await botConfig.save();

    autoMessageEmbed.setDescription("Successfully disabled auto-messages");
    interaction.editReply({ embeds: [autoMessageEmbed] });
  } catch (error) {
    console.log(error);
    autoMessageEmbed.setDescription(
      "An error occurred whilst disabling auto-messages.",
    );
    interaction.editReply({ embeds: [autoMessageEmbed] });
  }
};

module.exports = {
  name: "disable-auto-messages",
  description: "Disable bot's auto messages",
  serverSpecific: true,
  channelIndependent: true,
  callback: handleDisableAutoMessages,
};
