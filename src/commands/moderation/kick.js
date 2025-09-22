const {
  ApplicationCommandOptionType,
  PermissionFlagsBits,
  Client,
  Interaction,
  MessageFlags,
} = require("discord.js");

/**
 * @param {Client} client
 * @param {Interaction} interaction
 */
const handleKick = async (client, interaction) => {
  const targetUserId = interaction.options.get("target-user").value;
  const reason =
    interaction.options.get("reason")?.value || "No reason provided";

  await interaction.deferReply();

  // Fetch the target member
  const targetUser = await interaction.guild.members
    .fetch(targetUserId)
    .catch(() => null);

  if (!targetUser) {
    return interaction.editReply({
      content: "❌ That user doesn't exist in this server.",
      flags: MessageFlags.Ephemeral,
    });
  }

  // Cannot ban the server owner
  if (targetUser.id === interaction.guild.ownerId) {
    return interaction.editReply({
      content: "❌ Cannot kick the server owner.",
      flags: MessageFlags.Ephemeral,
    });
  }

  const targetRolePosition = targetUser.roles.highest.position; // Target's highest role
  const requesterRolePosition = interaction.member.roles.highest.position; // Command issuer's highest role
  const botRolePosition = interaction.guild.members.me.roles.highest.position; // Bot's highest role

  // Check role hierarchy
  if (targetRolePosition >= requesterRolePosition) {
    return interaction.editReply({
      content:
        "❌ You cannot kick this user because they have the same or higher role than you.",
      flags: MessageFlags.Ephemeral,
    });
  }

  if (targetRolePosition >= botRolePosition) {
    return interaction.editReply({
      content:
        "❌ I cannot kick this user because they have the same or higher role than me.",
      flags: MessageFlags.Ephemeral,
    });
  }

  // Attempt to kick the user
  try {
    await targetUser.kick({ reason });
    await interaction.editReply({
      content: `✅ Successfully kicked **${targetUser.user.tag}**\n\n**Reason:** ${reason}`,
    });
  } catch (error) {
    console.error(error);
    await interaction.editReply({
      content: "❌ An error occurred while trying to kick the user.",
      flags: MessageFlags.Ephemeral,
    });
  }
};

module.exports = {
  name: "kick",
  description: "Kicks a user from the server.",
  options: [
    {
      name: "target-user",
      description: "The user you want to kick",
      type: ApplicationCommandOptionType.User,
      required: true,
    },
    {
      name: "reason",
      description: "The reason for kicking",
      type: ApplicationCommandOptionType.String,
    },
  ],
  permissionsRequired: [
    PermissionFlagsBits.Administrator,
    PermissionFlagsBits.KickMembers,
  ],
  botPermissionsRequired: [
    PermissionFlagsBits.Administrator,
    PermissionFlagsBits.KickMembers,
  ],
  channelIndependent: true,
  callback: handleKick,
};
