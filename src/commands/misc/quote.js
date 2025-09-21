const {
  Client,
  Interaction,
  ApplicationCommandOptionType,
  EmbedBuilder,
  MessageFlags,
} = require("discord.js");

const cooldownUsers = new Set();

const API_URL = "https://rapido.zetsu.xyz/api/quote";

/**
 * @param {Client} client
 * @param {Interaction} interaction
 */
const handleLyrics = async (client, interaction) => {
  const song = interaction.options.getString("song");
  const artist = interaction.options.getString("artist");

  if (cooldownUsers.has(interaction.user.id)) {
    return interaction.reply({
      content:
        "⏳ You're on cooldown! Please wait a few seconds before using this command again.",
      flags: MessageFlags.Ephemeral,
    });
  }

  try {
    await interaction.deferReply();

    const response = await fetch(API_URL);

    if (!response.ok) throw new Error("non-200 status response");

    const json = await response.json();

    const quoteEmbed = new EmbedBuilder()
      .setTitle(`${json.author} once said:`)
      .setDescription(`"${json.quote}"`)
      .setColor("Random")
      .setTimestamp()
      .setFooter({
        text: `Requested by: ${interaction.user.displayName}`,
        iconURL: interaction.user.avatarURL(),
      });

    await interaction.editReply({ embeds: [quoteEmbed] });

    cooldownUsers.add(interaction.user.id);

    setTimeout(() => {
      cooldownUsers.delete(interaction.user.id);
    }, 5000);
  } catch (error) {
    console.error(error);
    interaction.editReply("An error occurred whilst processing your response.");
  }
};

module.exports = {
  name: "quote",
  description: "Sends a random quote.",
  serverSpecific: true,
  callback: handleLyrics,
};
