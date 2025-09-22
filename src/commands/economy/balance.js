const { Client, Interaction, ApplicationCommandOptionType } = require("discord.js");
const User = require("../../models/User")

/**
 * @param {Interaction} interaction
 * @param {Client} client
 */
const handleBalance = async (client, interaction) => {
  await interaction.deferReply();

  // Get the user from options or default to the command invoker
  const userOpt = interaction.options.get("user")?.user || interaction.user;

  if (userOpt.bot) {
    await interaction.editReply(`❌ You cannot check a bot's balance!`);
    setTimeout(() => {
      interaction.deleteReply();
    }, 3000);
    return;
  }

  try {
    // Fetch user data from DB
    const userData = await User.findOne({ guildId: interaction.guild.id, userId: userOpt.id });
    const balance = userData?.balance || 0;

    await interaction.editReply(`💰 ${userOpt.id !== interaction.member.id ? `**${userOpt.tag}**'s` : `Your`} balance is: **${balance}**`);
  } catch (error) {
    console.log(error);
    await interaction.editReply(`❌ An error occurred while fetching the balance.`);
  }
};

module.exports = {
  name: "balance",
  description: "Check your/someone's balance",
  options: [
    {
      name: "user",
      description: "The user you want to check",
      type: ApplicationCommandOptionType.User
    }
  ],
  cooldown: 5000,
  callback: handleBalance
};
