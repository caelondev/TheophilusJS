const {
  Client,
  Interaction,
  ApplicationCommandOptionType,
  EmbedBuilder,
  AttachmentBuilder,
  MessageFlags,
} = require("discord.js");
const fs = require("fs");
const path = require("path");
const capitalizeFirstLetter = require("../../utils/capitalizeFirstLetter");
const downloadFile = require("../../utils/downloadFile");

const deleteFiles = (files) => {
  for (const file of files) fs.unlink(file, () => {});
};

const handlePinterest = async (client, interaction) => {
  const imageQuery = interaction.options.getString("image-query");
  const quantity = interaction.options.getNumber("quantity");
  const cacheDir = path.join(__dirname, "..", "cache");
  const embed = new EmbedBuilder().setColor("Blurple").setTimestamp();
  const downloadedFiles = [];

  try {
    if (quantity < 1 || !Number.isInteger(quantity)) {
      embed
        .setDescription(
          quantity < 1
            ? "Invalid amount! Image quantity must be at least **1**"
            : "Invalid amount! You can only use **whole numbers** for image quantity"
        )
        .setColor("Red");
      return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }

    await interaction.deferReply();
    embed.setDescription(`Fetching images for **"${imageQuery}"**...`);
    await interaction.editReply({ embeds: [embed] });

    const response = await fetch(
      `https://rapido.zetsu.xyz/api/pin?search=${encodeURIComponent(
        imageQuery.trim().toLowerCase()
      )}&count=${encodeURIComponent(quantity)}`
    );

    if (!response.ok) {
      embed.setDescription(`Error fetching images: ${response.status}`).setColor("Red");
      return interaction.editReply({ embeds: [embed] });
    }

    const json = await response.json();
    let images = [...new Set((json.data || []).filter(Boolean))];

    if (!images.length) {
      embed.setDescription(`No images found for **"${imageQuery}"**`).setColor("Red");
      return interaction.editReply({ embeds: [embed] });
    }

    embed.setDescription(`Found **${images.length}** image(s) for **"${imageQuery}"**`);
    await interaction.editReply({ embeds: [embed] });

    for (let i = 0; i < images.length; i++) {
      embed.setDescription(`Downloading image **${i + 1} of ${images.length}**...`);
      await interaction.editReply({ embeds: [embed] });

      const fileName = path.basename(images[i]);
      const filePath = path.join(cacheDir, fileName);
      await fs.promises.mkdir(cacheDir, { recursive: true });

      const savedPath = await downloadFile(images[i], filePath);
      downloadedFiles.push(savedPath);
    }

    // Select random thumbnail and copy
    const randomThumbnail =
      downloadedFiles[Math.floor(Math.random() * downloadedFiles.length)];
    const thumbnailCopyPath = path.join(
      cacheDir,
      `thumbnail_${Date.now()}_${path.basename(randomThumbnail)}`
    );
    await fs.promises.copyFile(randomThumbnail, thumbnailCopyPath);

    const batchSize = 10;
    for (let i = 0; i < downloadedFiles.length; i += batchSize) {
      const batchFiles = downloadedFiles.slice(i, i + batchSize);
      const attachments = batchFiles.map((file) => new AttachmentBuilder(file));

      if (i === 0) {
        const embedCopy = EmbedBuilder.from(embed)
          .setTitle(`Result(s) for: **${capitalizeFirstLetter(imageQuery)}**`)
          .setDescription(
            `Found **${downloadedFiles.length}** image(s) related to **"${imageQuery}"**`
          )
          .setThumbnail(`attachment://${path.basename(thumbnailCopyPath)}`);

        if (attachments.length < 10)
          attachments.push(new AttachmentBuilder(thumbnailCopyPath));

        await interaction.editReply({ embeds: [embedCopy], files: attachments });
      } else {
        await interaction.followUp({ files: attachments });
      }
    }

    deleteFiles([...downloadedFiles, thumbnailCopyPath]);
  } catch (error) {
    embed
      .setDescription(`An error occurred while searching for **"${imageQuery}"**`)
      .setColor("Red");
    await interaction.editReply({ embeds: [embed] });
    deleteFiles([...downloadedFiles]);
    console.error(error);
  }
};

module.exports = {
  name: "pinterest",
  description: "Search images",
  options: [
    {
      name: "image-query",
      description: "The image you want to browse",
      type: ApplicationCommandOptionType.String,
      required: true,
    },
    {
      name: "quantity",
      description: "The number of images you want to search",
      type: ApplicationCommandOptionType.Number,
      required: true,
    },
  ],
  cooldown: 20_000,
  callback: handlePinterest,
};
