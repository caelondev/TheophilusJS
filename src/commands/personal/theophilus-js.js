require("dotenv").config();
const { Client, Interaction, ApplicationCommandOptionType, MessageFlags } = require("discord.js");
const Groq = require("groq-sdk");
const ChatbotConversation = require("../../models/ChatbotConversation");

const groq = new Groq({ apiKey: process.env.GROQ_KEY });

const MAX_DISCORD_LENGTH = 2000;
const COOLDOWN_MS = 3000;
const MAX_CONVERSATION_LENGTH = 15; // max messages to keep in conversation

/**
 * Fetch AI response from Groq
 */
const getGroqChatCompletion = (conversation) => {
  return groq.chat.completions.create({
    messages: conversation,
    model: "openai/gpt-oss-120b"
  });
};

/**
 * Handles the /theophilus-js command
 * @param {Client} client
 * @param {Interaction} interaction
 */
const handleTheophilusJs = async (client, interaction) => {
  const prompt = interaction.options.get("prompt").value;

  try {
    await interaction.deferReply({ ephemeral: false }); // main response is public

    // --- fetch or init guild conversation ---
    const guildId = interaction.guildId;
    let doc = await ChatbotConversation.findOneAndUpdate(
      { guildId },
      { $setOnInsert: { guildId, conversation: [] } },
      { new: true, upsert: true }
    );

    // conversation base
    let conversation = [
      {
        role: "system",
        content: "Your name is TheophilusJS. You're a helpful chatbot that responds in the same language as the user. Your owner's User ID is 1264839050427367570 whilst their name is theophilus_dev."
      },
      ...doc.conversation.map(msg => ({
        role: msg.role,
        content: msg.content
      }))
    ];

    // add user prompt
    conversation.push({
      role: "user",
      content: prompt
    });

    // --- trim oldest non-system messages if too long ---
    while (conversation.length > MAX_CONVERSATION_LENGTH) {
      const firstNonSystemIndex = conversation.findIndex(msg => msg.role !== "system");
      if (firstNonSystemIndex !== -1) {
        conversation.splice(firstNonSystemIndex, 1);
      } else {
        break;
      }
    }

    // ask Groq
    const response = await getGroqChatCompletion(conversation);
    const aiMessage = response.choices[0]?.message?.content || "TheophilusJS did not respond.";
    const aiReasoning = response.choices[0]?.message?.reasoning || "No reasoning provided.";

    // ephemeral reasoning
    const reasoningMsg = await interaction.followUp({
      content: `**${client.user.username} Reasoned:**\n\n${aiReasoning}`,
      ephemeral: true
    });

    // auto-delete reasoning after delay
    const delay = Math.min(10000 + aiReasoning.length * 5, 60000); // max 60s
    setTimeout(() => {
      reasoningMsg.delete().catch(() => {});
    }, delay);

    // send AI message (split if > 2000 chars)
    if (aiMessage.length <= MAX_DISCORD_LENGTH) {
      await interaction.followUp({ content: aiMessage });
    } else {
      let start = 0;
      while (start < aiMessage.length) {
        const chunk = aiMessage.slice(start, start + MAX_DISCORD_LENGTH);
        await interaction.followUp({ content: chunk });
        start += MAX_DISCORD_LENGTH;
      }
    }

    // --- update conversation in Mongo (atomic push + trim) ---
    await ChatbotConversation.updateOne(
      { guildId },
      {
        $push: {
          conversation: {
            $each: [
              { role: "user", content: prompt },
              { role: "assistant", content: aiMessage }
            ],
            $slice: -20 // keep last 20 entries
          }
        }
      }
    );
  } catch (error) {
    console.error(error);
    if (interaction.replied || interaction.deferred) {
      await interaction.editReply("An error occurred while processing your request. Please try again later.");
    } else {
      await interaction.reply("An error occurred while processing your request. Please try again later.");
    }
  }
};

module.exports = {
  name: "theophilus-js",
  description: "An AI assistant that will help you",
  options: [
    {
      name: "prompt",
      description: "The message you want to send to the bot",
      type: ApplicationCommandOptionType.String,
      required: true
    }
  ],
  cooldown: 5000,
  callback: handleTheophilusJs
};
