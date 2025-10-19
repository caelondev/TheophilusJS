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

/**
 * @param {Client} client
 * @param {Interaction} interaction
 * */

const handleUnban = async (client, interaction) => {
  const userTag = interaction.options.get("user-tag").value;

  await interaction.deferReply();

  const guild = client.guilds.cache.get(interaction.guildId);
  const banlist = await guild.bans.fetch();

  const bannedUser = banlist.find((b) => b.user.tag === userTag);

  if (!bannedUser) {
    return interaction.editReply({
      content: `❌ **${userTag}** is not banned.`,
      flags: MessageFlags.Ephemeral,
    });
  }

  try {
    await guild.members.unban(bannedUser.user.id);
    await interaction.editReply(
      `✅ **${userTag}** has been successfully unbanned.`,
    );
  } catch (error) {
    console.error(error);
    await interaction.editReply({
      content: "❌ Failed to unban this user.",
      flags: MessageFlags.Ephemeral,
    });
  }
};

module.exports = {
  name: "unban",
  description: "Unbans a user",
  options: [
    {
      name: "user-tag",
      description: "The tag of the user to unban (e.g., User#1234)",
      type: ApplicationCommandOptionType.String,
      required: true,
    },
  ],
  channelIndependent: true,
  permissionsRequired: [
    PermissionFlagsBits.Administrator,
    PermissionFlagsBits.BanMembers,
  ],
  botPermissionsRequired: [
    PermissionFlagsBits.Administrator,
    PermissionFlagsBits.BanMembers,
  ],
  serverSpecific: true,
  callback: handleUnban,
};
