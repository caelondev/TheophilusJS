const {
  Client,
  Interaction,
  ApplicationCommandOptionType,
  MessageFlags,
} = require("discord.js");

const cooldown = new Set();

/**
 * @param {Client} client
 * @param {Interaction} interaction
 */
const handleSay = async (client, interaction) => {
  const prompt = interaction.options.getString("prompt");

  if (cooldown.has(interaction.user.id)) {
    return interaction.reply({
      content:
        "⏳ You're on cooldown! Please wait a few seconds before using this command again.",
      flags: MessageFlags.Ephemeral,
    });
  }

  try {
    await interaction.reply(prompt);

    cooldown.add(interaction.user.id);

    setTimeout(() => {
      cooldown.delete(interaction.user.id);
    }, 5000);
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
  callback: handleSay,
};
