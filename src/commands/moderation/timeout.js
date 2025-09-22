const {
  ApplicationCommandOptionType,
  PermissionFlagsBits,
  Client,
  Interaction,
  MessageFlags,
  Message,
} = require("discord.js");
const { callback } = require("./ban");
const ms = require("ms");

/**
 * @param {Client} client
 * @param {Interaction} interaction
 */

const handleTimeout = async (client, interaction) => {
  const user = interaction.options.get("target-user").value;
  const duration = interaction.options.get("duration").value;
  const reason =
    interaction.options.get("reason")?.value || "No reason provided.";

  await interaction.deferReply();

  const targetUser = await interaction.guild.members.fetch(user);
  if (!targetUser) {
    return interaction.editReply({
      content:
        "❌ Error: The user you mentioned is not available. They might have left the server or their account cannot be reached.",
      flags: MessageFlags.Ephemeral,
    });
  }

  if (targetUser.user.bot) {
    return interaction.editReply({
      content: "❌ I can't timeout a bot.",
      flags: MessageFlags.Ephemeral,
    });
  }

  const msDuration = ms(duration);

  if (isNaN(msDuration)) {
    return interaction.editReply({
      content:
        "❌ I can't use that duration. Please enter a valid timeout duration.",
      flags: MessageFlags.Ephemeral,
    });
  }

  if (msDuration < 5000 || msDuration > 2.419e9) {
    // check if duration is less than 5 seconds and greater than 28 days
    return interaction.editReply({
      content:
        "❌ Invalid timeout duration. Please use a duration between 5 seconds and 28 days.",
    });
  }

  const targetRolePosition = targetUser.roles.highest.position; // Target's highest role
  const requesterRolePosition = interaction.member.roles.highest.position; // Command issuer's highest role
  const botRolePosition = interaction.guild.members.me.roles.highest.position; // Bot's highest role

  if (targetRolePosition >= requesterRolePosition) {
    return interaction.editReply({
      content:
        "❌ You cannot timeout this user because they have the same or higher role than you.",
      flags: MessageFlags.Ephemeral,
    });
  }

  if (targetRolePosition >= botRolePosition) {
    return interaction.editReply({
      content:
        "❌ I cannot timeout this user because they have the same or higher role than me.",
      flags: MessageFlags.Ephemeral,
    });
  }

  // timeout the user
  try {
    const { default: prettyMs } = await import("pretty-ms");

    if (targetUser.isCommunicationDisabled()) {
      await targetUser.timeout(msDuration, reason);
      return interaction.editReply(
        `✅ **${targetUser}**'s timeout has been updated to **${prettyMs(msDuration, { verbose: true })}**.\n\n**Reason:** ${reason}`,
      );
    }

    await targetUser.timeout(msDuration, reason);
    await interaction.editReply(
      `✅ **${targetUser}** was timed out for **${prettyMs(msDuration, { verbose: true })}**.\n\n**Reason:** ${reason}`,
    );
  } catch (error) {
    console.log(`There was an error: ${error}`);
  }
};

module.exports = {
  name: "timeout",
  description: "Mutes a user.",
  options: [
    {
      name: "target-user",
      description: "The user you want to mute",
      type: ApplicationCommandOptionType.User,
      required: true,
    },
    {
      name: "duration",
      description: "Timeout duration (30m, 1h, 1d)",
      type: ApplicationCommandOptionType.String,
      required: true,
    },
    {
      name: "reason",
      description: "The reason for the timeout",
      type: ApplicationCommandOptionType.String,
    },
  ],
  channelIndependent: true,
  permissionsRequired: [
    PermissionFlagsBits.Administrator,
    PermissionFlagsBits.MuteMembers,
  ],
  botPermissionsRequired: [
    PermissionFlagsBits.Administrator,
    PermissionFlagsBits.MuteMembers,
  ],
  callback: handleTimeout,
};
