/**
 * Created by caelondev
 * Licensed under the GNU AGPLv3
 * See LICENSE for details.
 */

require("dotenv").config();
const { Client, Message } = require("discord.js");
const cooldowns = new Set();
const Groq = require("groq-sdk");
const capitalizeFirstLetter = require("../../utils/capitalizeFirstLetter");
const BotConfig = require("../../models/BotConfig");

const groq = new Groq({ apiKey: process.env.GROQ_KEY });

/**
 * @param {Client} client
 * @param {Message} message
 */
module.exports = async (client, message) => {
  if (message.author.bot) return;

  const userId = message.author.id;
  if (cooldowns.has(userId)) return;

  setTimeout(() => cooldowns.delete(userId), 60_000);

  const greetHandler = async (attempt = 0, maxRetries = 3) => {
    try {
      let botConfig = await BotConfig.findOne({ guildId: message.guild.id });

      if (!botConfig)
        botConfig = await new BotConfig({ guildId: message.guild.id });
      if (!botConfig.autoMessagesEnabled) return;

      const greet = await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: `You are a multilingual greeting bot made to greet the user back if they greeted you

Here are your rules for replying:
1. If the user prompt is NOT a greet, EXACTLY say 'NO_GREETING'.
2. Follow their vibe — if they greeted happily, reciprocate their vibe.
3. ALWAYS mention the user with <@${message.author.id}> (if they mentioned someone else, greet that user instead).
4. STRICTLY FOLLOW THE RULES.
5. Greet them back in the language they used.
6. Add related emojis base on the greet vibe
7. Be creative wih your response

STARTING FROM NOW, REPLY 'NO_GREETING' IF THE USER'S PROMPT IS NOT A GREET.`,
          },
          {
            role: "user",
            content: message.content,
          },
        ],
        model: "openai/gpt-oss-20b",
        max_completion_tokens: 300,
        temperature: 0.2,
      });

      const response =
        greet.choices?.[0]?.message?.content?.trim() ||
        greet.choices?.[0]?.text?.trim() ||
        "";

      if (response && response !== "NO_GREETING")
        await message.reply(capitalizeFirstLetter(response));

      cooldowns.add(userId);
    } catch (error) {
      console.log("Groq API Error:", error);

      const retryAfter = error?.headers?.["retry-after"];
      if (retryAfter && attempt < maxRetries) {
        const waitMs = Number(retryAfter) * 1000 || 1000;
        console.log(
          `Rate limit hit, retrying in ${waitMs}ms (attempt ${attempt + 1})`,
        );
        await new Promise((r) => setTimeout(r, waitMs));
        return greetHandler(attempt + 1, maxRetries);
      }

      if (
        error.message?.includes("rate_limit_exceeded") ||
        attempt >= maxRetries
      ) {
        console.log("Rate limit hit - using simple fallback");
        const greetingPattern =
          /^(hi|hello|hey|good morning|good evening|sup|yo)\b/i;
        if (greetingPattern.test(message.content.trim())) {
          await message.reply(`Hello <@${message.author.id}>! 👋`);
        }
      }
    }
  };

  greetHandler();
};
