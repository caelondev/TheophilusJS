const {
  Client,
  Interaction,
  ApplicationCommandOptionType,
  EmbedBuilder,
  AttachmentBuilder,
  Message,
  MessageFlags,
} = require("discord.js");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const capitalizeFirstLetter = require("../../utils/capitalizeFirstLetter");
const { printer } = require("systeminformation");

const deleteFiles = (files) => {
  for (const file of files) fs.unlink(file, () => {});
};

const downloadImage = async (url, saveDir) => {
  const fileName = url.split("/").pop();
  const savePath = path.join(saveDir, fileName);
  await fs.promises.mkdir(saveDir, { recursive: true });
  const response = await axios({ url, method: "GET", responseType: "stream" });
  const writer = fs.createWriteStream(savePath);
  response.data.pipe(writer);
  return new Promise((resolve, reject) => {
    writer.on("finish", () => resolve(savePath));
    writer.on("error", reject);
  });
};

const handlePinterest = async (client, interaction) => {
  const imageQuery = interaction.options.getString("image-query");
  const quantity = interaction.options.getNumber("quantity");
  const cacheDir = path.join(__dirname, "..", "cache");
  const embed = new EmbedBuilder().setColor("Blurple").setTimestamp();

  if (quantity < 1) {
    embed
      .setDescription(
        "Invalid amount! Image quantity more than or equal to **1**",
      )
      .setColor("Red");
    return interaction.reply({
      embeds: [embed],
      flags: MessageFlags.Ephemeral,
    });
  }

  if (!Number.isInteger(quantity)) {
    embed
      .setDescription(
        "Invalid amount! You can only use **whole numbers** for image quantity",
      )
      .setColor("Red");
    return interaction.reply({
      embeds: [embed],
      flags: MessageFlags.Ephemeral,
    });
  }

  try {
    await interaction.deferReply();
    embed.setDescription(`Fetching images for **"${imageQuery}"**...`);
    await interaction.editReply({ embeds: [embed] });

    const response = await fetch(
      `https://rapido.zetsu.xyz/api/pin?search=${encodeURIComponent(imageQuery.trim().toLowerCase())}&count=${encodeURIComponent(quantity)}`,
    );
    if (!response.ok) {
      embed
        .setDescription(`Error fetching images: ${response.status}`)
        .setColor("Red");
      return interaction.editReply({ embeds: [embed] });
    }

    const json = await response.json();
    let images = json.data || [];
    images = [...new Set(images.filter((url) => url))];
    embed.setDescription(
      `Found **${images.length}** images for **"${imageQuery}"**`,
    );
    await interaction.editReply({ embeds: [embed] });

    const downloadedFiles = [];
    for (let i = 0; i < images.length; i++) {
      embed.setDescription(
        `Downloading image **${i + 1} of ${images.length}**...`,
      );
      await interaction.editReply({ embeds: [embed] });
      const filePath = await downloadImage(images[i], cacheDir);
      downloadedFiles.push(filePath);
    }

    const randomThumbnail =
      downloadedFiles[Math.floor(Math.random() * downloadedFiles.length)];
    const thumbnailCopyPath = path.join(
      cacheDir,
      `thumbnail_${Date.now()}_${path.basename(randomThumbnail)}`,
    );
    await fs.promises.copyFile(randomThumbnail, thumbnailCopyPath);

    const batchSize = 10;

    for (let i = 0; i < downloadedFiles.length; i += batchSize) {
      const batchFiles = downloadedFiles.slice(i, i + batchSize);
      const attachments = batchFiles.map((file) => new AttachmentBuilder(file));

      if (i === 0) {
        attachments.push(new AttachmentBuilder(thumbnailCopyPath));

        embed
          .setTitle(`Result(s) for: **${capitalizeFirstLetter(imageQuery)}**`)
          .setDescription(
            `Found **${downloadedFiles.length}** image(s) related to **"${imageQuery}"**`,
          )
          .setThumbnail(`attachment://${path.basename(thumbnailCopyPath)}`);

        await interaction.editReply({ embeds: [embed], files: attachments });
      } else {
        await interaction.followUp({ files: attachments });
      }
    }

    deleteFiles([...downloadedFiles, thumbnailCopyPath]);

    deleteFiles([...downloadedFiles, thumbnailCopyPath]);
  } catch (error) {
    embed
      .setDescription(
        `An error occurred while searching for **"${imageQuery}"**`,
      )
      .setColor("Red");
    await interaction.editReply({ embeds: [embed] });
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
  cooldown: 30_000,
  callback: handlePinterest,
};
