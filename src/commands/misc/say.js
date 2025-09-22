const {
  Client,
  Interaction,
  ApplicationCommandOptionType,
  MessageFlags,
} = require("discord.js");

/**
 * @param {Client} client
 * @param {Interaction} interaction
 */
const handleSay = async (client, interaction) => {
  const prompt = interaction.options.getString("prompt");

  try {
    await interaction.reply(prompt);
  } catch (error) {
    console.error(error);
  }
};

module.exports = {
  name: "say",
  description: "Make the bot say something",
  options: [
    {
      name: "prompt",
      description: "The prompt you want the bot to say",
      type: ApplicationCommandOptionType.String,
      required: true,
    },
  ],
  cooldown: 5000,
  callback: handleSay,
};
