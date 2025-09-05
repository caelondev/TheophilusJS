const { ApplicationCommandOptionType, PermissionFlagsBits, MessageFlags } = require("discord.js");

module.exports = {
  name: "ban",
  description: "Bans a user",
  options: [
    {
      name: "target-user",
      description: "The user to ban",
      type: ApplicationCommandOptionType.Mentionable,
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

  callback: async (client, interaction) => {
    const targetUser = interaction.options.getMentionable("target-user");
    const reason = interaction.options.getString("reason") || "No reason provided";

    try {
      // Attempt to ban the user
      await interaction.guild.members.ban(targetUser, { reason });

      // Respond with a success message
      await interaction.reply({
        content: `Successfully banned ${targetUser.tag} for reason: ${reason}`,
      });
    } catch (error) {
      // Handle any errors that occur
      console.error(error);
      await interaction.reply({
        content: `Failed to ban ${targetUser.tag}. Please ensure I have the necessary permissions.`,
        flags: MessageFlags.Ephemeral
      });
    }
  },
};
