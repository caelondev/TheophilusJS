const {
  Client,
  Interaction,
  EmbedBuilder,
  ApplicationCommandOptionType,
  MessageFlags,
} = require("discord.js");
const fs = require("fs");
const path = require("path");
const getRandom = require("../../utils/getRandom");

const cacheDir = path.join(__dirname, "../cache");
if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

const getKissGif = async () => {
  const query = "anime kiss";
  const gifResponse = await fetch(
    `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(query)}&key=${process.env.TENOR_KEY}&limit=5&media_filter=gif`,
  );
  if (!gifResponse.ok) throw new Error("Failed to fetch GIF");

  const gifJson = await gifResponse.json();
  const gifObject = getRandom(gifJson.results);
  const gifUrl =
    gifObject?.media_formats?.gif?.url ||
    gifObject?.media_formats?.mediumgif?.url ||
    gifObject?.url;
  if (!gifUrl) throw new Error("No valid GIF URL found");

  const gifBuffer = await (await fetch(gifUrl)).arrayBuffer();
  const fileName = `kiss-${Date.now()}.gif`;
  const filePath = path.join(cacheDir, fileName);
  fs.writeFileSync(filePath, Buffer.from(gifBuffer));

  return filePath;
};

const handleKiss = async (client, interaction) => {
  const targetUser = interaction.options.getUser("user");

  const kissEmbed = new EmbedBuilder().setColor("Blurple").setTimestamp();

  if (targetUser.bot) {
    kissEmbed.setDescription("You can't kiss a bot!").setColor("Red");
    await interaction.reply({
      embeds: [kissEmbed],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (targetUser.id === interaction.user.id) {
    kissEmbed.setDescription("You can't kiss yourself!").setColor("Red");
    await interaction.reply({
      embeds: [kissEmbed],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  try {
    await interaction.deferReply();

    const gifPath = await getKissGif();

    kissEmbed
      .setAuthor({
        name: `${interaction.user.username} kisses ${targetUser.username}!`,
        iconURL: interaction.user.avatarURL() || undefined,
      })
      .setImage(`attachment://${path.basename(gifPath)}`);

    await interaction.editReply({ embeds: [kissEmbed], files: [gifPath] });

    fs.unlinkSync(gifPath);
  } catch (error) {
    kissEmbed
      .setDescription("An error occurred whilst processing your request")
      .setAuthor(null);
    await interaction.editReply({ embeds: [kissEmbed] });
    console.log(error);
  }
};

module.exports = {
  name: "kiss",
  description: "Kiss someone",
  options: [
    {
      name: "user",
      description: "The user you want to kiss",
      type: ApplicationCommandOptionType.User,
      required: true,
    },
  ],
  cooldown: 5000,
  serverSpecific: true,
  callback: handleKiss,
};
