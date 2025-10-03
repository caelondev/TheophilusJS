const {
  Client,
  Interaction,
  EmbedBuilder,
  ApplicationCommandOptionType,
  MessageFlags,
} = require("discord.js");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const getRandom = require("../../utils/getRandom");

const cacheDir = path.join(__dirname, "../cache");
if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

const getCompatibilityGif = async (compatibility) => {
  let query = "";
  if (compatibility > 90) query = "anime couple kiss";
  else if (compatibility > 70) query = "anime couple hug";
  else if (compatibility > 40) query = "anime awkward blush";
  else query = "anime couple sad cry";

  const gifResponse = await fetch(
    `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(query.trim())}&key=${process.env.TENOR_KEY}&limit=5&media_filter=gif`
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
  const fileName = `compat-${Date.now()}.gif`;
  const filePath = path.join(cacheDir, fileName);
  fs.writeFileSync(filePath, Buffer.from(gifBuffer));

  return filePath;
};

const getCompatibility = (user1Id, user2Id) => {
  const idSum = BigInt(user1Id) + BigInt(user2Id);
  const hash = crypto.createHash("md5").update(idSum.toString()).digest("hex");
  return parseInt(hash.slice(0, 4), 16) % 101;
};

const getCompatibilityMessage = (compatibility) => {
  if (compatibility > 90) return "❤️ Perfect match!";
  else if (compatibility > 70) return "💖 Looks promising!";
  else if (compatibility > 40) return "🙂 Could work...";
  else return "😐 Not so compatible!";
};

const handleShip = async (client, interaction) => {
  const shipTo = interaction.options.getUser("ship-to");
  const shipWith = interaction.options.getUser("ship-with") || interaction.user
  const shipEmbed = new EmbedBuilder().setColor("Blurple").setTimestamp();

  if (shipTo.bot || shipWith.bot) {
    shipEmbed.setDescription("You can't ship a bot!").setColor("Red");
    await interaction.reply({ embeds: [shipEmbed], flags: MessageFlags.Ephemeral });
    return;
  }

  if (shipTo === shipWith) {
    shipEmbed.setDescription("You can't ship the same person!").setColor("Red");
    await interaction.reply({ embeds: [shipEmbed], flags: MessageFlags.Ephemeral });
    return;
  }

  try {
    await interaction.deferReply();

    const compatibility = getCompatibility(shipTo.id, shipWith.id);
    const gifPath = await getCompatibilityGif(compatibility);
    const compatibilityMessage = getCompatibilityMessage(compatibility);

    shipEmbed
      .setAuthor({
        name: `Shipped by ${interaction.user.displayName}`,
        iconURL: interaction.user.avatarURL() || undefined,
      })
      .setTitle(compatibilityMessage)
      .setDescription(`${shipWith} 👫 ${shipTo}\nCompatibility: **${compatibility}%**`)
      .setImage(`attachment://${path.basename(gifPath)}`);

    await interaction.editReply({ embeds: [shipEmbed], files: [gifPath] });

    fs.unlinkSync(gifPath);
  } catch (error) {
    shipEmbed.setDescription("An error occurred whilst processing your request").setAuthor(null);
    await interaction.editReply({ embeds: [shipEmbed] });
    console.log(error);
  }
};

module.exports = {
  name: "ship",
  description: "Ship someone to another user and check compatibility",
  options: [
    {
      name: "ship-to",
      description: "The user you want to ship someone to",
      type: ApplicationCommandOptionType.User,
      required: true,
    },
    {
      name: "ship-with",
      description: "The user to ship to the first user (defaults to you)",
      type: ApplicationCommandOptionType.User,
    },
  ],
  cooldown: 5000,
  serverSpecific: true,
  callback: handleShip,
};
