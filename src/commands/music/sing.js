/**
 * Created by caelondev
 * Licensed under the GNU AGPLv3
 * See LICENSE for details.
 */

const {
  Client,
  Interaction,
  ApplicationCommandOptionType,
  EmbedBuilder,
  AttachmentBuilder,
} = require("discord.js");
const cfl = require("../../utils/capitalizeFirstLetter");
const path = require("path");
const fs = require("fs").promises;

const setDescription = async (message, embed, interaction) => {
  embed.setDescription(message);
  await interaction.editReply({ embeds: [embed] });
};

const getMatchedQueryResult = async (
  jsonData,
  songName,
  songArtist,
  songEmbed,
  interaction
) => {
  const jsonArray = Object.values(jsonData);

  if (jsonArray.length === 0) {
    await setDescription("No results found.", songEmbed, interaction);
    return null;
  }

  const artist = songArtist ? songArtist.trim().toLowerCase() : "";
  const song = songName.trim().toLowerCase();

  for (const query of jsonArray) {
    if (!query || typeof query !== "object") continue;

    const querySong = query.name?.trim().toLowerCase() || "";
    const queryArtist = query.artist?.trim().toLowerCase() || "";

    if (artist && querySong.includes(song) && queryArtist.includes(artist)) {
      return query;
    } else if (!artist && querySong.includes(song)) {
      return query;
    }
  }

  return null;
};

/**
 * @param {Client} client
 * @param {Interaction} interaction
 */
const handleSing = async (client, interaction) => {
  const songName = interaction.options.getString("song-name");
  const songArtist = interaction.options.getString("song-artist");

  const songEmbed = new EmbedBuilder()
    .setColor("Blurple")
    .setFooter({
      text: `Requested by ${interaction.user.username}`,
      iconURL: interaction.user.avatarURL(),
    })
    .setTimestamp();

  try {
    await interaction.deferReply();

    const artistDisplay = songArtist ? `**${cfl(songArtist)}** —` : "";
    await setDescription(
      `Fetching ${artistDisplay} **${cfl(songName)}**...`,
      songEmbed,
      interaction
    );

    const response = await fetch(
      `https://rapido.zetsu.xyz/api/sp?query=${encodeURIComponent(songName.trim().toLowerCase())}`
    );

    if (!response.ok) {
      await setDescription(
        `Failed to fetch ${artistDisplay} **${cfl(songName)}**. Status code: ${response.status}`,
        songEmbed,
        interaction
      );
      return;
    }

    const json = await response.json();
    const searchResult = await getMatchedQueryResult(
      json,
      songName,
      songArtist,
      songEmbed,
      interaction
    );

    if (!searchResult || !searchResult.url) {
      await setDescription(
        `No valid results found for "${songName}"${songArtist ? ` by ${songArtist}` : ""}.`,
        songEmbed,
        interaction
      );
      return;
    }

    await setDescription(
      `Found **${searchResult.artist}** — **${searchResult.name}**. Downloading...`,
      songEmbed,
      interaction
    );

    const downloadResponse = await fetch(
      `https://rapido.zetsu.xyz/api/sp-dl?url=${encodeURIComponent(searchResult.url)}`
    );

    if (!downloadResponse.ok) {
      await setDescription(
        `Failed to download **${searchResult.artist}** — **${searchResult.name}**`,
        songEmbed,
        interaction
      );
      return;
    }

    const downloadJson = await downloadResponse.json();
    const trackData = downloadJson.trackData?.[0];

    if (!trackData || !trackData.download_url) {
      await setDescription(
        `No downloadable file found for **${searchResult.artist}** — **${searchResult.name}**`,
        songEmbed,
        interaction
      );
      return;
    }

    const fetchedMusic = await fetch(trackData.download_url);
    if (!fetchedMusic.ok) {
      await setDescription(
        `Error downloading **${searchResult.artist}** — **${searchResult.name}**. Status: ${fetchedMusic.status}`,
        songEmbed,
        interaction
      );
      return;
    }

    const buffer = Buffer.from(await fetchedMusic.arrayBuffer());
    const normalizedName = trackData.name.replace(/[<>:"/\\|?*]+/g, "_");
    const cacheDir = path.join(__dirname, "..", "cache");
    const filePath = path.join(cacheDir, `${normalizedName}.mp3`);

    await fs.mkdir(cacheDir, { recursive: true });
    await fs.writeFile(filePath, buffer);

    const songAttachment = new AttachmentBuilder(filePath, {
      name: `${normalizedName}.mp3`,
    });

    songEmbed
      .setTitle(trackData.name)
      .setDescription(
        `- By **${trackData.artists || searchResult.artist}**\n- Duration: **${trackData.duration || "Unknown"}**`
      );

    await interaction.editReply({
      embeds: [songEmbed],
      files: [songAttachment],
    });

    await fs.unlink(filePath);
  } catch (error) {
    console.error(error);
    songEmbed.setColor("Red");
    await setDescription(
      "An error occurred whilst processing your request.",
      songEmbed,
      interaction
    );
  }
};

module.exports = {
  name: "sing",
  description: "Sends a song as a voice message.",
  options: [
    {
      name: "song-name",
      description: "The song you want the bot to send",
      type: ApplicationCommandOptionType.String,
      required: true,
    },
    {
      name: "song-artist",
      description: "The song artist's name",
      type: ApplicationCommandOptionType.String,
    },
  ],
  cooldown: 10_000,
  callback: handleSing,
};
