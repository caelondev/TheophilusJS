/**
 * Created by caelondev
 * Licensed under the GNU AGPLv3
 * See LICENSE for details.
 */

const { Client, Message } = require("discord.js");
const cooldowns = new Set();
const capitalizeFirstLetter = require("../../utils/capitalizeFirstLetter");
const FilteredWords = require("../../models/FilteredWords");

module.exports = async (client, message) => {
  if (message.author.bot) return;
  try {
    const filteredWords = await FilteredWords.findOne({ guildId: message.guild.id });
    if (!filteredWords || !filteredWords?.filteredWords) return;

    for (const word of filteredWords.filteredWords) {
      const normalizedMessage = message.content.toLowerCase();
      if (normalizedMessage.includes(word.toLowerCase())) {
        await message.delete();
        const msg = await message.channel.send({
          content: `${message.author}. Your message has been deleted because it contains a blacklisted word: **"${word}"**`
        });
        setTimeout(() => msg.delete().catch(() => {}), 5000);
      }
    }
  } catch (error) {}
};
