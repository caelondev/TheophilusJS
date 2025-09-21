const {
  Client,
  Interaction,
  ApplicationCommandOptionType,
  EmbedBuilder,
  MessageFlags,
} = require("discord.js");

const cooldownUsers = new Set();

const filterData = (results, song, artist) => {
  if (!results || results.length === 0) return [];

  const normalizedSong = song ? song.toLowerCase().trim() : "";
  const normalizedArtist = artist ? artist.toLowerCase().trim() : "";

  const data = results.map((result) => ({
    song: result.name,
    artist: result.artistName,
    lyrics: result.plainLyrics,
  }));

  if (!artist) {
    return data.filter((d) => d.song.toLowerCase() === normalizedSong);
  }

  return data.filter(
    (d) =>
      d.song.toLowerCase() === normalizedSong &&
      d.artist.toLowerCase().includes(normalizedArtist),
  );
};

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

    const response = await fetch(
      `https://apis-keith.vercel.app/search/lyrics3?query=${encodeURIComponent(
        song.trim(),
      )}`,
    );
    if (!response.ok) throw new Error("non-200 status");

    const json = await response.json();
    const filteredData = filterData(json.result, song, artist);

    if (filteredData.length === 0) {
      return interaction.editReply(
        `No results found for **${song}**${artist ? ` by ${artist}` : ""}.`,
      );
    }

    const first = filteredData[0];

    const chunks = first.lyrics.match(/[\s\S]{1,4000}/g) || [];

    const lyricsEmbed = new EmbedBuilder()
      .setTitle(`${first.song} | ${first.artist}`)
      .setColor("Random")
      .setDescription(chunks[0])
      .setTimestamp();

    await interaction.editReply({ embeds: [lyricsEmbed] });

    for (let i = 1; i < chunks.length; i++) {
      await interaction.followUp({
        embeds: [
          new EmbedBuilder()
            .setColor("Random")
            .setDescription(chunks[i])
            .setTimestamp(),
        ],
      });
    }

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
  name: "lyrics",
  description: "Check a song's lyrics.",
  options: [
    {
      name: "song",
      description: "The song you want to inspect",
      type: ApplicationCommandOptionType.String,
      required: true,
    },
    {
      name: "artist",
      description: "The artist's name.",
      type: ApplicationCommandOptionType.String,
    },
  ],
  serverSpecific: true,
  callback: handleLyrics,
};
