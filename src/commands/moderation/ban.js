/**
 * Created by caelondev
 * Licensed under the GNU AGPLv3
 * See LICENSE for details.
 */

const {
  ApplicationCommandOptionType,
  PermissionFlagsBits,
  Client,
  Interaction,
  MessageFlags,
} = require("discord.js");
const drawLine = require("../../utils/drawLine")

/**
 * @param {Client} client
 * @param {Interaction} interaction
 */
const handleBan = async (client, interaction) => {
  const targetUserId = interaction.options.get("target-user").value;
  const reason = interaction.options.get("reason")?.value || "No reason provided";

  await interaction.deferReply({ ephemeral: true });

  // Fetch the target member
  const targetUser = await interaction.guild.members.fetch(targetUserId).catch(() => null);

  if (!targetUser) {
    return interaction.editReply({
      content: "❌ That user doesn't exist in this server.",
      flags: MessageFlags.Ephemeral
    });
  }

  // Cannot ban the server owner
  if (targetUser.id === interaction.guild.ownerId) {
    return interaction.editReply({
      content: "❌ Cannot ban the server owner.",
      flags: MessageFlags.Ephemeral
    });
  }

  const targetRolePosition = targetUser.roles.highest.position; // Target's highest role
  const requesterRolePosition = interaction.member.roles.highest.position; // Command issuer's highest role
  const botRolePosition = interaction.guild.members.me.roles.highest.position; // Bot's highest role

  // Check role hierarchy
  if (targetRolePosition >= requesterRolePosition) {
    return interaction.editReply({
      content: "❌ You cannot ban this user because they have the same or higher role than you.",
      flags: MessageFlags.Ephemeral
    });
  }

  if (targetRolePosition >= botRolePosition) {
    return interaction.editReply({
      content: "❌ I cannot ban this user because they have the same or higher role than me.",
      flags: MessageFlags.Ephemeral
    });
  }

  // Attempt to ban the user
  try {
    var output =`✅ Successfully banned **${targetUser.user.tag}**\n\n**Reason:** ${reason}`
    output += drawLine()
    output += `Enter \`/unban **${targetUser.user.tag}**\` to unban **${targetUser.user.tag}**`
    
    await targetUser.ban({ reason });
    await interaction.editReply({
      content: output
    });
  } catch (error) {
    console.error(error);
    await interaction.editReply({
      content: "❌ An error occurred while trying to ban the user.",
      flags: MessageFlags.Ephemeral
    });
  }
};

module.exports = {
  name: "ban",
  description: "Bans a user from the server.",
  options: [
    {
      name: "target-user",
      description: "The user you want to ban",
      type: ApplicationCommandOptionType.User,
      required: true,
    },
    {
      name: "reason",
      description: "The reason for banning",
      type: ApplicationCommandOptionType.String,
    },
  ],
  permissionsRequired: [
    PermissionFlagsBits.Administrator,
    PermissionFlagsBits.BanMembers,
  ],
  botPermissionsRequired: [
    PermissionFlagsBits.Administrator,
    PermissionFlagsBits.BanMembers,
  ],
  serverSpecific: true,
  channelIndependent: true,
  callback: handleBan,
};
