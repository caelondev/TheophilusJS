/**
 * Created by caelondev
 * Licensed under the GNU AGPLv3
 * See LICENSE for details.
 */

const {
  Client,
  ChatInputCommandInteraction,
  ApplicationCommandOptionType,
  PermissionFlagsBits,
} = require("discord.js");
const AutoRole = require("../../models/AutoRole");

/**
 * @param {Client} client
 * @param {ChatInputCommandInteraction} interaction
 */
const handleAutoRoleConfigure = async (client, interaction) => {
  try {
    // Defer the reply (ephemeral)
    await interaction.deferReply({ ephemeral: true });

    const roleOpt = interaction.options.getRole("role");

    // Fetch or create autorole config
    let autoRoleConfig = await AutoRole.findOne({
      guildId: interaction.guild.id,
    });
    if (!autoRoleConfig) {
      autoRoleConfig = new AutoRole({ guildId: interaction.guild.id });
    }

    autoRoleConfig.roleId = roleOpt.id;

    await autoRoleConfig.save();

    // Final response
    await interaction.editReply(
      `✅ Successfully set the autorole to **${roleOpt.name}**.`,
    );
  } catch (error) {
    console.error(error);

    if (interaction.deferred || interaction.replied) {
      await interaction.editReply(
        "❌ An error occurred while setting the autorole. Please try again later...",
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
  name: "autorole-set",
  description: "Set the autorole for new members",
  options: [
    {
      name: "role",
      description: "The role to assign automatically to new members",
      type: ApplicationCommandOptionType.Role,
      required: true,
    },
  ],
  permissionsRequired: [PermissionFlagsBits.Administrator],
  serverSpecific: true,
  channelIndependent: true,
  callback: handleAutoRoleConfigure,
};
