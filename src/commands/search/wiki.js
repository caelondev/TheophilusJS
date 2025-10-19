/**
 * Created by caelondev
 * Licensed under the GNU AGPLv3
 * See LICENSE for details.
 */

const {
  Client,
  Interaction,
  EmbedBuilder,
  ApplicationCommandOptionType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
} = require("discord.js");
const chunkMessage = require("../../utils/chunkMessage");

/**
 * @param {Client} client
 * @param {Interaction} interaction
 */
const handleWiki = async (client, interaction) => {
  const query = interaction.options.getString("query");
  const wikiEmbed = new EmbedBuilder().setTimestamp().setColor("Blurple").setAuthor({ name: "Wikipedia", iconURL: "https://en.m.wikipedia.org/wiki/File:Wikipedia-logo-v2.svg" }).setFooter({ text: `Requested by ${interaction.user.displayName}`, iconURL: interaction.user.avatarURL() })

  try {
    await interaction.deferReply();

    const response = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query.toLowerCase().trim())}`,
    );

    if (!response.ok)
      throw new Error(
        `Failed to fetch data about **"${query}"**... Status code: **${response.status} — ${response.statusText}**`,
      );

    const json = await response.json();
    const descriptionChunks = chunkMessage(json.extract, 4096, "...");

    const embeds = descriptionChunks.map((chunk, i) => {
      const e = new EmbedBuilder()
        .setColor("Blurple")
        .setTitle(json.title)
        .setDescription(chunk)
        .setURL(json.content_urls?.desktop?.page || null)
        .setTimestamp()
        .setAuthor({ name: "Wikipedia" })
        .setFooter({ text: `Requested by ${interaction.user.displayName}`, iconURL: interaction.user.avatarURL() })
;

      if ("thumbnail" in json) e.setThumbnail(json.thumbnail.source);
      if (descriptionChunks.length > 1)
        e.setFooter({ text: `Page ${i + 1}/${descriptionChunks.length}` });

      return e;
    });

    if (embeds.length === 1) return interaction.editReply({ embeds });

    let currentPage = 0;
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("prev")
        .setLabel("⬅️ Previous")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(true),
      new ButtonBuilder()
        .setCustomId("next")
        .setLabel("Next ➡️")
        .setStyle(ButtonStyle.Primary),
    );

    const message = await interaction.editReply({
      embeds: [embeds[currentPage]],
      components: [row],
    });

    const collector = message.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 600_000,
    });

    collector.on("collect", (btnInteraction) => {
      if (!btnInteraction.isButton()) return;

      if (btnInteraction.user.id !== interaction.user.id) {
        return btnInteraction.reply({
          content: "You cannot use these buttons.",
          ephemeral: true,
        });
      }

      if (btnInteraction.customId === "next") currentPage++;
      if (btnInteraction.customId === "prev") currentPage--;

      row.components[0].setDisabled(currentPage === 0);
      row.components[1].setDisabled(currentPage === embeds.length - 1);

      btnInteraction.update({
        embeds: [embeds[currentPage]],
        components: [row],
      });
    });

    collector.on("end", () => {
      row.components.forEach((btn) => btn.setDisabled(true));
      message.edit({ components: [row] }).catch(() => {});
    });
  } catch (error) {
    wikiEmbed.setTitle("An error occurred").setDescription(error?.message);
    interaction.editReply({ embeds: [wikiEmbed] }).catch(() => {});
  }
};

module.exports = {
  name: "wiki",
  description: "Browse Wikipedia",
  options: [
    {
      name: "query",
      description: "Your search query",
      required: true,
      type: ApplicationCommandOptionType.String,
    },
  ],
  cooldown: 5000,
  callback: handleWiki,
};
