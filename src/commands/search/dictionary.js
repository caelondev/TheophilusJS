const {
  ApplicationCommandOptionType,
  Client,
  Interaction,
  EmbedBuilder,
  AttachmentBuilder
} = require("discord.js");
const axios = require("axios");
const path = require("path");
const fs = require("fs");
const cfl = require("../../utils/capitalizeFirstLetter");
const camelToWord = require("../../utils/camelToWord");

const getFormattedData = (json) => {
  if (!json || !json.meanings || json.meanings.length === 0) return "No definitions found.";

  const indent = (level) => "  ".repeat(level);

  const formatRecursive = (data, level = 0) => {
    if (Array.isArray(data)) {
      const filtered = data.filter(item => item !== null && item !== undefined && item !== "" && !(Array.isArray(item) && item.length === 0));
      if (filtered.length === 0) return "";
      return filtered.map(item => formatRecursive(item, level)).filter(Boolean).join("\n");
    } 
    if (typeof data === "object" && data !== null) {
      const entries = Object.entries(data).filter(
        ([k, v]) => v !== null && v !== undefined && v !== "" &&
                    k !== "audio" && k !== "sourceUrl" &&
                    !(Array.isArray(v) && v.length === 0) &&
                    !(typeof v === "object" && Object.keys(v).length === 0)
      );
      if (entries.length === 0) return "";
      return entries.map(([key, value]) => {
        const formattedKey = camelToWord(key);
        let formatted = `${indent(level)}**${formattedKey}:**`;
        if (typeof value === "string" || typeof value === "number") {
          formatted += ` ${value}`;
        } else {
          const nested = formatRecursive(value, level + 1);
          if (nested) formatted += `\n${nested}`;
          else return "";
        }
        return formatted;
      }).filter(Boolean).join("\n");
    }
    return `${indent(level)}${data}`;
  };

  const parts = [];
  if (json.word) parts.push(`**Word:** ${json.word}`);
  if (json.phonetic) parts.push(`**Phonetic:** ${json.phonetic}`);
  const meaningsFormatted = formatRecursive(json.meanings);
  if (meaningsFormatted) parts.push(meaningsFormatted);

  return parts.join("\n\n");
};

const getAudioPath = async (json) => {
  if (!json || !json.audio) return { status: false, path: null };
  try {
    const url = json.audio;
    const filePath = path.join(__dirname, `Pronounce ${cfl(json.word)}.mp3`);
    const res = await axios.get(url, { responseType: "stream" });
    await new Promise((resolve, reject) => {
      const writer = fs.createWriteStream(filePath);
      res.data.pipe(writer);
      writer.on("finish", resolve);
      writer.on("error", reject);
    });
    return { status: true, path: filePath };
  } catch {
    return { status: false, path: null };
  }
};

const handleDictionary = async (client, interaction) => {
  const word = interaction.options.getString("word");
  const embed = new EmbedBuilder()
    .setColor("Blurple")
    .setTimestamp()
    .setFooter({ text: `Searched by ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() });

  try {
    await interaction.deferReply();
    embed.setDescription(`Fetching data about **"${word}"**`);
    await interaction.editReply({ embeds: [embed] });

    const { data: json } = await axios.get(`https://api.ccprojectsapis-jonell.gleeze.com/api/dictio?q=${encodeURIComponent(word.trim().toLowerCase())}`);

    const audioPath = await getAudioPath(json);
    const formattedData = getFormattedData(json);

    const files = audioPath.status && audioPath.path ? [new AttachmentBuilder(audioPath.path)] : [];

    embed.setTitle(`Descriptions for **"${cfl(json.word)}"**`).setDescription(formattedData);
    await interaction.editReply({ embeds: [embed], files });

    for (const file of files) {
      if (file?.attachment) fs.unlink(file.attachment, () => {});
    }

  } catch {
    embed.setTitle("Error!").setDescription("An error occurred! Try again later...").setColor("Red");
    await interaction.editReply({ embeds: [embed] });
  }
};

module.exports = {
  name: "dictionary",
  description: "Surf the dictionary",
  options: [
    {
      name: "word",
      description: "The word that you want to search",
      type: ApplicationCommandOptionType.String,
      required: true
    }
  ],
  serverSpecific: false,
  channelIndependent: false,
  callback: handleDictionary
};
