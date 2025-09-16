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
        content: `You are a multilingual greeting detector.

Rules:
1. If the user's message is ONLY a simple greeting word or short phrase (examples: "hi", "hoy", "yo", "hello", "hey, "hola", "bonjour", "kamusta", "안녕", "こんにちは", etc.) in ANY language, reply with a friendly greeting in the same language and mention the user who sent it with <@${message.author.id}>.
2. If the greeting ALSO contains mentions of other users, include those mentions in your reply (example: if the user says "hola user1 user2", reply "hola <@senderId>, user1, and user2 (only do this if the mentioned user is not theophilus js or any close naming convention, and ALWAYS MENTION THE USER FIRST (THE ONE THAT PROMPTED) BEFORE EVERYONE ELSE.)").
3. If the message contains ANYTHING more than a plain greeting (questions, sentences, extra words like "how are you", etc.), reply with exactly: NO_GREETING.
4. Never add explanations, translations, or extra text. Only output the greeting response or "NO_GREETING".
5. Add an effort to your response, add emojis and send an entire friendly greet sentence

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
