const {
  ApplicationCommandOptionType,
  Client,
  Interaction,
  MessageFlags,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
} = require("discord.js");

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const formatPage = (jsonData) =>
  `- Type: ${jsonData.type || "Unknown"}\n` +
  `- Episodes: ${jsonData.episodes || "Unknown"}\n` +
  `- Score: ${jsonData.score || "Unrated"}\n` +
  `- Description: ${jsonData.description || "No description found."}\n`;

const listenPageButtons = (collector, pageRef, animeEmbed, animeArray) => {
  collector.on("collect", async (interact) => {
    try {
      if (interact.customId === "anime-first") pageRef.page = 0;
      else if (interact.customId === "anime-prev") pageRef.page = clamp(pageRef.page - 1, 0, animeArray.length - 1);
      else if (interact.customId === "anime-next") pageRef.page = clamp(pageRef.page + 1, 0, animeArray.length - 1);
      else if (interact.customId === "anime-last") pageRef.page = animeArray.length - 1;

      const anime = animeArray[pageRef.page];
      const description = animeArray.length > 0 ? formatPage(anime) : "No results found.";

      const updatedEmbed = EmbedBuilder.from(animeEmbed)
        .setDescription(description)
        .setTitle(anime?.title || "Untitled Anime")
        .setFooter({ text: `Page ${pageRef.page + 1} of ${animeArray.length}` });

      if (anime?.link) updatedEmbed.setURL(anime.link);
      if (anime?.imageUrl) updatedEmbed.setThumbnail(anime.imageUrl);

      await interact.update({ embeds: [updatedEmbed] });
    } catch {
      animeEmbed.setColor("Red").setDescription("An error occurred whilst changing page");
      await interact.followUp({ embeds: [animeEmbed], flags: MessageFlags.Ephemeral });
    }
  });
};

const handleAnimeList = async (client, interaction) => {
  const animeName = interaction.options.getString("anime-name");
  const animeEmbed = new EmbedBuilder()
    .setColor("Blurple")
    .setFooter({
      text: `Requested by: ${interaction.user.tag}`,
      iconURL: interaction.user.displayAvatarURL(),
    })
    .setTimestamp();

  try {
    await interaction.deferReply();

    if (!animeName || !animeName.trim()) {
      animeEmbed.setColor("Red").setDescription("Please provide an anime name.");
      return await interaction.editReply({ embeds: [animeEmbed], components: [] });
    }

    const response = await fetch(
      `https://aryanapi.up.railway.app/api/animesearch?query=${encodeURI(
        animeName.trim().toLowerCase()
      )}`
    );

    if (!response.ok) {
      animeEmbed
        .setDescription(`Received non-200 response from the API: ${response.status}`)
        .setColor("Red");
      return await interaction.editReply({ embeds: [animeEmbed], components: [] });
    }

    let animeArray = await response.json();

    if (!Array.isArray(animeArray) || animeArray.length === 0) {
      animeEmbed.setDescription("No results found.").setColor("Blurple");
      return await interaction.editReply({ embeds: [animeEmbed], components: [] });
    }

    animeArray = animeArray.filter((anime) => {
      const an = anime.title?.trim().toLowerCase();
      const queryAnime = animeName.toLowerCase().trim();
      return an && an.includes(queryAnime);
    });

    if (!Array.isArray(animeArray) || animeArray.length === 0) {
      animeEmbed.setDescription(`No results found for **"${animeName}"**, Try a different keyword.`).setColor("Blurple");
      return await interaction.editReply({ embeds: [animeEmbed], components: [] });
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("anime-first").setLabel("⏪").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("anime-prev").setLabel("◀️").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("anime-next").setLabel("▶️").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("anime-last").setLabel("⏩").setStyle(ButtonStyle.Primary)
    );

    const pageRef = { page: 0 };
    const anime = animeArray[pageRef.page];
    const description = formatPage(anime);

    animeEmbed
      .setDescription(description)
      .setTitle(anime?.title || "Untitled Anime")
      .setFooter({ text: `Page ${pageRef.page + 1} of ${animeArray.length}` });

    if (anime?.link) animeEmbed.setURL(anime.link);
    if (anime?.imageUrl) animeEmbed.setThumbnail(anime.imageUrl);

    const choice = await interaction.editReply({ embeds: [animeEmbed], components: [row] });

    const collector = choice.createMessageComponentCollector({
      componentType: ComponentType.Button,
      filter: (i) => i.user.id === interaction.user.id,
      time: 600_000,
    });

    listenPageButtons(collector, pageRef, animeEmbed, animeArray);
  } catch (error) {
    animeEmbed.setDescription("An error occurred whilst processing your request").setColor("Red");
    console.error(error);
    try {
      await interaction.editReply({ embeds: [animeEmbed], components: [] });
    } catch {}
  }
};

module.exports = {
  name: "anime-list",
  description: "Browse your anime of choice with AnimeList",
  options: [
    {
      name: "anime-name",
      description: "The name of the anime you want to Browse",
      type: ApplicationCommandOptionType.String,
      required: true,
    },
  ],
  serverSpecific: false,
  cooldown: 5000,
  channelIndependent: false,
  callback: handleAnimeList,
};
