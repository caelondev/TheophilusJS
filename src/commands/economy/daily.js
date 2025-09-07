const { Client, Interaction } = require('discord.js');
const User = require('../../models/User');
const getRandomRange = require("../../utils/getRandomRange")

/**
 * @param {Client} client
 * @param {Interaction} interaction
 */
const handleDaily = async (client, interaction) => {
  try {
    await interaction.deferReply();
    const dailyAmount = getRandomRange(100, 1000)
    const query = {
      userId: interaction.member.id,
      guildId: interaction.guild.id,
    };

    let user = await User.findOne(query);

    const { default: prettyMs } = await import("pretty-ms");
    const currentDate = new Date();

    if (user) {
      if (user.lastDaily) {
        // Calculate next daily time (24 hours after last claim)
        const nextDaily = new Date(user.lastDaily.getTime() + 24 * 60 * 60 * 1000);
        const remainingTime = nextDaily - currentDate;

        if (remainingTime > 0) {
          const durationTime = prettyMs(remainingTime, { unitCount: 2, milliseconds: false });

          const reply = interaction.editReply(
            `⏳ You’ve already collected your daily reward today. Wait for **${durationTime}** and try again!`
          );
          setTimeout(()=>{interaction.deleteReply(reply)}, 5000)
          return;
        }
      }
      user.lastDaily = currentDate;
    } else {
      user = new User({
        ...query,
        lastDaily: currentDate,
        balance: 0,
      });
    }

    user.balance += dailyAmount;
    await user.save();

    interaction.editReply(
      `✅ **+${dailyAmount} coins** has been added to your balance. Your current balance is **${user.balance}**.`
    );
  } catch (error) {
    console.log(`Error with /daily: ${error}`);
    interaction.editReply({
      content: '❌ Oops! Something went wrong while executing this command.',
    });
  }
};

module.exports = {
  name: 'daily',
  description: 'Collect your daily reward!',
  serverSpecific: true,
  callback: handleDaily,
};
