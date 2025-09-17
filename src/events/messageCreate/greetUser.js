require("dotenv").config();
const { Client, Message } = require("discord.js");
const cooldowns = new Set();
const Groq = require("groq-sdk");
const capitalizeFirstLetter = require("../../utils/capitalizeFirstLetter")

const groq = new Groq({ apiKey: process.env.GROQ_KEY });

/**
 * @param {Client} client
 * @param {Message} message
 */
module.exports = async (client, message) => {
  if(message.author.bot) return;

  const userId = message.author.id;
  if (cooldowns.has(userId)) return;
  
  setTimeout(() => cooldowns.delete(userId), 15_000);

  try {
    const greet = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
        content: `You are a multilingual greeting bot. made to greet the user back if they greeted you

here are your rules for replying:
1. if the user prompt is NOT a greet, EXACTLY say 'NO_GREETING' or an empty string.
2. follow their vibe, if they greeted happily, reciprocate their vibe
3. ALWAYS mention the user with <@${interaction.user.id}>, if they mentioned someone in their pronpt, mention that user instead.
4. STRICTLY FOLLOW THE RULES
5. greet them back with the language they spoke

STARTING FOR NOW, REPLY 'NO_GREETING' OR AN EMPTY STRING IF THE USER'S PROMPT IS NOT A GREET`
        },
        {
          role: "user",
          content: message.content,
        },
      ],
      model: "groq/compound-mini",
      max_tokens: 50, // Limit response length
      temperature: 0.7,
    });

    const response = greet.choices[0]?.message?.content?.trim()

    if (response && response !== "NO_GREETING"){
      message.reply(capitalizeFirstLetter(response));
      cooldowns.add(userId);
    }
    
  } catch (error) {
    console.log("Groq API Error:", error.message);
    
    // Fallback for rate limits
    if (error.message.includes("rate_limit_exceeded")) {
      console.log("Rate limit hit - using simple fallback");
      // Simple regex fallback for common greetings
      const greetingPattern = /^(hi|hello|hey|good morning|good evening|sup|yo)\b/i;
      if (greetingPattern.test(message.content.trim())) {
        message.reply(`Hello <@${message.author.id}>! 👋`);
      }
    }
  }
};
