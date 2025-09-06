const {
  ApplicationCommandOptionType,
  PermissionFlagsBits,
  Client,
  Interaction,
  MessageFlags,
  isJSONEncodable,
  Message,
} = require("discord.js");
const { description, callback } = require("./ban");
const drawLine = require("../../utils/drawLine")

/**
 * @param {Client} client
 * @param {Interaction} interaction
 */

const handleBanlist = async (client, interaction) => {
  const guild = await client.guilds.cache.get(interaction.guildId);
  const banlistObj = await guild.bans.fetch();

  await interaction.deferReply();

  try {
    if (banlistObj.size === 0) {
      return interaction.editReply({
        content: "**ℹ️ There are no banned users.**",
        flags: MessageFlags.Ephemeral,
      });
    }

    let output = "### 📋 Here is the list of banned users:\n";
    output += drawLine(20, "—", true) + "\n";

    for (const data of banlistObj.values()) {
      const getUser = await client.users.fetch(data.user);
      const userTag = getUser.tag;
      const reason = data.reason || "No reason provided."

      output += `• **${data.user}** / **${userTag}** — **${reason}**\n`;
    }

    interaction.editReply(output);
  } catch (error) {
    console.log(`An error occurred: ${error}`);
    interaction.editReply({
      content: "❌ An error occurred.",
      flags: MessageFlags.Ephemeral,
    });
  }
};

module.exports = {
  name: "banlist",
  description: "Lists all banned users.",
  callback: handleBanlist,
  permissionsRequired: [PermissionFlagsBits.Administrator, PermissionFlagsBits.ModerateMembers, PermissionFlagsBits.BanMembers]
};
