const { Client, ChatInputCommandInteraction, PermissionFlagsBits } = require("discord.js");
const AutoRole = require("../../models/AutoRole");

/**
 * @param {Client} client
 * @param {ChatInputCommandInteraction} interaction
 */
const handleDisableAutorole = async (client, interaction) => {
  try {
    // Defer immediately (non-ephemeral by default)
    await interaction.deferReply();

    // Check if autorole exists
    const exists = await AutoRole.exists({ guildId: interaction.guild.id });
    if (!exists) {
      await interaction.editReply(
        "❌ Autorole hasn’t been configured! Type `/autorole-configure` to set it up."
      );

      // Delete the reply after 3s
      setTimeout(async () => {
        if (interaction.deferred || interaction.replied) {
          await interaction.deleteReply().catch(() => {});
        }
      }, 3000);

      return;
    }

    // Delete config
    await AutoRole.findOneAndDelete({ guildId: interaction.guild.id });

    // Success message
    await interaction.editReply(
      "✅ Successfully disabled autorole! Type `/autorole-configure` to set it up again."
    );
  } catch (error) {
    console.error("There was an error:", error);

    // Safe fallback
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply(
        "❌ An unexpected error occurred while disabling autorole. Please try again later."
      );
    } else {
      await interaction.reply({
        content: "❌ An unexpected error occurred before I could respond.",
      });
    }
  }
};

module.exports = {
  name: "autorole-disable",
  description: "Disable auto-role in this server.",
  permissionsRequired: [PermissionFlagsBits.Administrator],
  serverSpecific: true,
  channslIndependent: true,
  callback: handleDisableAutorole,
};
