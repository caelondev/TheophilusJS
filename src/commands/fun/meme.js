const {
  Client,
  Interaction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  MessageFlags,
  AttachmentBuilder,
} = require("discord.js");
const downloadFile = require("../../utils/downloadFile");
const fs = require("fs").promises;

const getFormattedDescription = (json) => {
  if (!json) throw new Error("No data found...");
  return `- Title: ${json.title}`;
};

const getMemeFlags = (json) => {
  const validFlags = ["nsfw", "spoiler"];
  return Object.entries(json)
    .filter(([key, value]) => validFlags.includes(key) && value === true)
    .map(([key]) => key);
};

const notifyUser = async (interaction, flagsArray) => {
  if (!flagsArray || flagsArray.length < 1) return true;

  return new Promise(async (resolve, reject) => {
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setStyle(ButtonStyle.Primary)
        .setCustomId("meme-continue")
        .setLabel("Continue"),
      new ButtonBuilder()
        .setStyle(ButtonStyle.Secondary)
        .setCustomId("meme-exit")
        .setLabel("Exit"),
    );

    const notifyEmbed = new EmbedBuilder()
      .setColor("Yellow")
      .setDescription(
        `⚠️ Warning! This meme is flagged as **[${flagsArray.join(", ")}]**. Do you wish to continue?`,
      );

    const response = await interaction.editReply({
      embeds: [notifyEmbed],
      components: [row],
    });

    const collector = response.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 120_000,
    });

    let resolved = false;

    collector.on("collect", async (btnInteract) => {
      if (btnInteract.user.id !== interaction.user.id) {
        const res = new EmbedBuilder()
          .setColor("Red")
          .setDescription("This is not your session.");
        return btnInteract.reply({ embeds: [res], ephemeral: true });
      }

      if (btnInteract.customId === "meme-exit") {
        await btnInteract.update({ components: [] });
        collector.stop("meme-exit");
      } else if (btnInteract.customId === "meme-continue") {
        await btnInteract.update({ components: [] });
        resolved = true;
        collector.stop("continue");
      }
    });

    collector.on("end", (_, reason) => {
      if (reason === "time") return reject("Session closed due to timeout");
      if (reason === "meme-exit") return reject("Session exited");
      if (resolved) return resolve(true);
      resolve(false);
    });
  });
};

const handleMeme = async (client, interaction) => {
  const memeEmbed = new EmbedBuilder()
    .setColor("Blurple")
    .setTimestamp()
    .setFooter({
      text: `Requested by ${interaction.user.username}`,
      iconURL: interaction.user.avatarURL(),
    });

  try {
    await interaction.deferReply();
    const response = await fetch("https://meme-api.com/gimme");

    if (!response.ok)
      throw new Error(
        `Error fetching memes: ${response.status} — ${response.statusText}`,
      );

    const json = await response.json();
    const formattedDescription = getFormattedDescription(json);
    const flagsArray = getMemeFlags(json);

    if (flagsArray.length > 0) {
      const userOk = await notifyUser(interaction, flagsArray);
      if (!userOk) return
    }

    memeEmbed.setDescription(`Downloading meme from r/${json.subreddit}...`);
    await interaction.editReply({ embeds: [memeEmbed] });

    const memePath = await downloadFile(json.url);
    const attachment = new AttachmentBuilder(memePath);

    memeEmbed
      .setTitle(`Meme from r/${json.subreddit}`)
      .setDescription(formattedDescription)
      .setAuthor({ name: `Posted by ${json.author}` })
      .setImage(`attachment://${memePath.split("/").pop()}`);

    await interaction.editReply({
      embeds: [memeEmbed],
      files: [attachment],
      components: [],
    });

    await fs.unlink(memePath);
  } catch (error) {
    console.error(error);
    memeEmbed.setTitle("Oops..").setDescription(error.message).setColor("Red");
    await interaction.editReply({ embeds: [memeEmbed], components: [] });
  }
};

module.exports = {
  name: "meme",
  description: "Sends a meme from a Reddit meme group",
  cooldown: 5000,
  callback: handleMeme,
};
