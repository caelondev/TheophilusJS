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

const getHugGif = async () => {
  const query = "anime hug";
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
  const fileName = `hug-${Date.now()}.gif`;
  const filePath = path.join(cacheDir, fileName);
  fs.writeFileSync(filePath, Buffer.from(gifBuffer));

  return filePath;
};

const handleHug = async (client, interaction) => {
  const targetUser = interaction.options.getUser("user");

  const hugEmbed = new EmbedBuilder().setColor("Blurple").setTimestamp();

  if (targetUser.bot) {
    hugEmbed.setDescription("You can't hug a bot!").setColor("Red");
    await interaction.reply({
      embeds: [hugEmbed],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (targetUser.id === interaction.user.id) {
    hugEmbed.setDescription("You can't hug yourself!").setColor("Red");
    await interaction.reply({
      embeds: [hugEmbed],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  try {
    await interaction.deferReply();

    const gifPath = await getHugGif();

    hugEmbed
      .setAuthor({
        name: `${interaction.user.username} hugs ${targetUser.username}!`,
        iconURL: interaction.user.avatarURL() || undefined,
      })
      .setImage(`attachment://${path.basename(gifPath)}`);

    await interaction.editReply({ embeds: [hugEmbed], files: [gifPath] });

    fs.unlinkSync(gifPath);
  } catch (error) {
    hugEmbed
      .setDescription("An error occurred whilst processing your request")
      .setAuthor(null);
    await interaction.editReply({ embeds: [hugEmbed] });
    console.log(error);
  }
};

module.exports = {
  name: "hug",
  description: "Hug someone",
  options: [
    {
      name: "user",
      description: "The user you want to hug",
      type: ApplicationCommandOptionType.User,
      required: true,
    },
  ],
  cooldown: 5000,
  serverSpecific: true,
  callback: handleHug,
};
