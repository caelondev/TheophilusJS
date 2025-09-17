require("dotenv").config();
const { Client, Message } = require("discord.js");
const cooldowns = new Set();
const Groq = require("groq-sdk");
const capitalizeFirstLetter = require("../../utils/capitalizeFirstLetter");

const groq = new Groq({ apiKey: process.env.GROQ_KEY });

/**
 * @param {Client} client
 * @param {Message} message
 */
module.exports = async (client, message) => {
  if (message.author.bot) return;

  const userId = message.author.id;
  if (cooldowns.has(userId)) return;

  setTimeout(() => cooldowns.delete(userId), 15_000);

  try {
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

STARTING FROM NOW, REPLY 'NO_GREETING' IF THE USER'S PROMPT IS NOT A GREET.`
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

    // Debug full response once to see structure
    console.log("Groq raw response:", JSON.stringify(greet, null, 2));

    const response =
      greet.choices?.[0]?.message?.content?.trim() ||
      greet.choices?.[0]?.text?.trim() ||
      "";

    console.log("Parsed response:", response);

    if (response && response !== "NO_GREETING") {
      await message.reply(capitalizeFirstLetter(response));
      cooldowns.add(userId);
    }

  } catch (error) {
    console.log("Groq API Error:", error);

    // Fallback for rate limits or errors
    if (error.message?.includes("rate_limit_exceeded")) {
      console.log("Rate limit hit - using simple fallback");
      const greetingPattern = /^(hi|hello|hey|good morning|good evening|sup|yo)\b/i;
      if (greetingPattern.test(message.content.trim())) {
        await message.reply(`Hello <@${message.author.id}>! 👋`);
      }
    }
  }
};
