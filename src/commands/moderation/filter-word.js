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
  PermissionFlagsBits
} = require("discord.js");
const FilteredWords = require("../../models/FilteredWords");

const randomSeed = (seed) => {
  let x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};

const consistentBlur = (word) => {
  const symbols = ["_", "%", "$", ";", ":", "#", '"', "!"];
  const used = new Set();
  const lower = word.toLowerCase();
  let seed = 0;
  for (let i = 0; i < lower.length; i++) seed += lower.charCodeAt(i) * (i + 1);
  const arr = lower.split("");
  const blurCount = Math.max(1, Math.floor(arr.length / 4));
  for (let i = 0; i < blurCount; i++) {
    const rIndex = Math.floor(randomSeed(seed + i) * arr.length);
    let rSymbol = symbols[Math.floor(randomSeed(seed * (i + 3)) * symbols.length)];
    while (used.has(rSymbol) && used.size < symbols.length)
      rSymbol = symbols[(symbols.indexOf(rSymbol) + 1) % symbols.length];
    used.add(rSymbol);
    arr[rIndex] = rSymbol;
  }
  return arr.join("");
};

const censorWord = (word) => `${consistentBlur(word)}`;

const addFilterWords = async (input, interaction) => {
  let filteredWords = await FilteredWords.findOne({ guildId: interaction.guild.id });
  if (!filteredWords)
    filteredWords = new FilteredWords({ guildId: interaction.guild.id, filteredWords: [] });

  const words = input.split(",").map(w => w.trim().toLowerCase()).filter(w => w.length > 0);
  if (!words.length) throw new Error("No valid words provided.");

  const added = [];
  for (const word of words) {
    if (!filteredWords.filteredWords.includes(word)) {
      filteredWords.filteredWords.push(word);
      added.push(word);
    }
  }
  if (!added.length) throw new Error("All provided words already exist in the filtered list.");
  await filteredWords.save();
  return added;
};

const removeFilterWord = async (word, interaction) => {
  const filteredWords = await FilteredWords.findOne({ guildId: interaction.guild.id });
  if (!filteredWords || !filteredWords.filteredWords.length)
    throw new Error("No filtered words found in the database.");
  const lowerWord = word.toLowerCase();
  if (lowerWord === "*" || lowerWord === "all") {
    filteredWords.filteredWords = [];
    await filteredWords.save();
    return "Cleared **all** filtered words.";
  }
  const index = filteredWords.filteredWords.indexOf(lowerWord);
  if (index === -1) throw new Error("That word is not in the filtered list.");
  filteredWords.filteredWords.splice(index, 1);
  await filteredWords.save();
  return `Removed **"${censorWord(lowerWord)}"** from the filtered list.`;
};

const listFilteredWords = async (interaction) => {
  const filteredWords = await FilteredWords.findOne({ guildId: interaction.guild.id });
  if (!filteredWords || !filteredWords.filteredWords.length)
    throw new Error("No filtered words found in the database.");
  return filteredWords.filteredWords.map(w => `- ${censorWord(w)}`).join("\n");
};

const safeReply = async (interaction, payload) => {
  try {
    await interaction.editReply(payload);
  } catch {
    await interaction.followUp(payload);
  }
};

const handleFilterWord = async (client, interaction) => {
  const subcommand = interaction.options.getSubcommand();
  const embed = new EmbedBuilder().setColor("Blurple").setTimestamp();
  try {
    await interaction.deferReply({ ephemeral: false });
    if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers))
      throw new Error("Only Moderators and up can use this command.");
    if (subcommand === "add") {
      const input = interaction.options.getString("word");
      const added = await addFilterWords(input, interaction);
      embed.setTitle("Successfully blacklisted this/these words").setDescription(added.map(w => `- **${censorWord(w)}**`).join("\n"));
      await safeReply(interaction, { embeds: [embed] });
    } else if (subcommand === "remove") {
      const word = interaction.options.getString("word");
      const message = await removeFilterWord(word, interaction);
      embed.setDescription(message);
      await safeReply(interaction, { embeds: [embed] });
    } else if (subcommand === "list") {
      const listedWords = await listFilteredWords(interaction);
      embed.setTitle(`Filtered Words in ${interaction.guild.name}`).setDescription(listedWords);
      await safeReply(interaction, { embeds: [embed] });
    }
  } catch (error) {
    const errorEmbed = new EmbedBuilder().setColor("Red").setTitle("Error").setDescription(error.message);
    await safeReply(interaction, { embeds: [errorEmbed] });
  }
};

module.exports = {
  name: "filter-word",
  description: "Manage filtered words for this server",
  options: [
    {
      name: "add",
      description: "Add one or multiple words (comma-separated) to filter",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: "word",
          description: "Word(s) to filter (use commas to add multiple)",
          type: ApplicationCommandOptionType.String,
          required: true
        }
      ]
    },
    {
      name: "remove",
      description: "Remove a word or all words from the filtered list",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: "word",
          description: "The word you want to remove (or * / all to clear all)",
          type: ApplicationCommandOptionType.String,
          required: true
        }
      ]
    },
    {
      name: "list",
      description: "List all filtered words in this server",
      type: ApplicationCommandOptionType.Subcommand
    }
  ],
  serverSpecific: true,
  callback: handleFilterWord
};
