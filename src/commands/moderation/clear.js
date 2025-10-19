/**
 * Created by caelondev
 * Licensed under the GNU AGPLv3
 * See LICENSE for details.
 */

const {
  ApplicationCommandOptionType,
  PermissionFlagsBits,
  EmbedBuilder,
  MessageFlags,
} = require("discord.js");

const handleClear = async (client, interaction) => {
  let messageQuantity = interaction.options.getNumber("message-quantity") || 1;
  messageQuantity = Math.max(1, Math.min(Math.floor(messageQuantity), 1000));

  const channelObj = interaction.options.getChannel("channel-name") || interaction.channel;

  const clearEmbed = new EmbedBuilder().setColor("Blurple");

  if (!channelObj || !channelObj.messages) {
    clearEmbed.setColor("Red").setDescription("That channel cannot be cleared by this command.");
    return interaction.reply({ embeds: [clearEmbed], flags: MessageFlags.Ephemeral });
  }

  try {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    let totalDeleted = 0;
    let totalFailed = 0;
    let remaining = messageQuantity;

    while (remaining > 0) {
      const fetchLimit = Math.min(remaining, 100);
      const fetched = await channelObj.messages.fetch({ limit: fetchLimit });
      const deletable = fetched.filter(m => !m.pinned);

      if (deletable.size === 0) break;

      const deleted = await channelObj.bulkDelete(deletable, true);
      const deletedCount = deleted?.size || 0;
      const failedCount = deletable.size - deletedCount;

      totalDeleted += deletedCount;
      totalFailed += failedCount;
      remaining -= deletable.size;

      if (deleted.size < fetchLimit) break;
    }

    clearEmbed
      .setTitle(`Removed ${totalDeleted} message${totalDeleted !== 1 ? "s" : ""} in ${channelObj}`)
      .setDescription(`${channelObj} is now squeaky clean!\nSuccessfully removed ${totalDeleted} messages\nFailed to delete **${totalFailed} messages**`)
      .setColor("Green");

    await interaction.editReply({ embeds: [clearEmbed] });
  } catch (error) {
    clearEmbed
      .setColor("Red")
      .setDescription(`An error occurred whilst trying to clear **${messageQuantity} messages** in ${channelObj}`);
    await interaction.editReply({ embeds: [clearEmbed] });
    console.error(error);
  }
};

module.exports = {
  name: "clear",
  description: "Clears N messages before the bot command (max 1000)",
  options: [
    {
      name: "message-quantity",
      description: "Number of messages to delete (max 1000)",
      type: ApplicationCommandOptionType.Number,
      required: true,
    },
    {
      name: "channel-name",
      description: "The channel to clear",
      type: ApplicationCommandOptionType.Channel,
    },
  ],
  serverSpecific: true,
  channelIndependent: true,
  permissionsRequired: [PermissionFlagsBits.ManageMessages],
  botPermissionsRequired: [PermissionFlagsBits.ManageMessages],
  callback: handleClear,
};
