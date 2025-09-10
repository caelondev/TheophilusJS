const {
  Client,
  Interaction,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  ComponentType,
  ApplicationCommandOptionType,
  MessageFlags,
} = require("discord.js");
const capitalizeFirstLetter = require("../../utils/capitalizeFirstLetter")
const User = require("../../models/User")

const tossCoin = () => {
  const sides = ["heads", "tails"];
  return sides[Math.floor(Math.random() * 2)];
};

/**
 * @param {Client} client
 * @param {Interaction} interaction
 * */

const createButtons = (disabled = false) => {
  const exitButton = new ButtonBuilder()
    .setLabel("Exit")
    .setStyle(ButtonStyle.Danger)
    .setCustomId("exit")
    .setDisabled(disabled);

  const headsButton = new ButtonBuilder()
    .setLabel("Heads")
    .setStyle(ButtonStyle.Primary)
    .setCustomId("heads")
    .setDisabled(disabled);

  const tailsButton = new ButtonBuilder()
    .setLabel("Tails")
    .setStyle(ButtonStyle.Primary)
    .setCustomId("tails")
    .setDisabled(disabled);

  return new ActionRowBuilder().addComponents(
    exitButton,
    headsButton,
    tailsButton,
  );
};

const handleCoinToss = async (client, interaction) => {
  if (interaction.user.bot) return;

  const buttonRow = createButtons(false);

  const betOpt = interaction.options.get("bet").value;

  // Validate bet amount (assuming it should be a number)
  let betAmount = parseFloat(betOpt);

  const query = {
    guildId: interaction.guild.id,
    userId: interaction.user.id
  }

  let user = await User.findOne(query)

  if(!user){
    user = new User({
      ...query
    })
  }

  if(user.balance <= 0){
    return interaction.reply({
      content: `❌ You don’t have enough balance to play.`,
      flags: MessageFlags.Ephemeral
    })
  }

  if (isNaN(betAmount)) {
    if(betOpt.toLowerCase() === "all"){
      betAmount = user.balance
    } else if(betOpt.toLowerCase() === "half"){
      betAmount = user.balance * 0.5
    } else {
      return interaction.reply({
        content: `❌ Invalid bet amount. Please enter a valid amount.`,
        flags: MessageFlags.Ephemeral
      })
    }
  }

  if(betAmount > user.balance){
    return interaction.reply({
      content: `❌ Your bet is higher than your current balance.`,
      flags: MessageFlags.Ephemeral
    })
  }

  await interaction.reply(`Your bet is: **${betAmount}**`);
  
  const choice = await interaction.followUp({
    content: `Pick a side!`,
    components: [buttonRow],
    fetchReply: true,
  });

  const collector = choice.createMessageComponentCollector({
    componentType: ComponentType.Button,
    filter: (i) => i.user.id === interaction.user.id,
    time: 30000, // 30 second timeout
  });

  collector.on("collect", async (i) => {
    try {
      if (i.customId === "exit") {
        await i.reply("Exiting...");
        collector.stop("exit");
        return; // Important: return here to prevent further execution
      }

      if (i.customId !== "heads" && i.customId !== "tails") {
        await i.reply({
          content: `Invalid choice! Exiting. Choice: ${i.customId}`,
          flags: MessageFlags.Ephemeral,
        });
        collector.stop("invalid");
        return;
      }

      const side = capitalizeFirstLetter(i.customId);
      const winnerSide = capitalizeFirstLetter(tossCoin());

      if (side === winnerSide) {
        user.balance += betAmount
        await user.save()
        await i.reply(
          `You picked **${side}** and the coin landed on **${winnerSide}** 🎉 You Won!\nYour new balance is now **${user.balance}**!`,
        );
      } else {
        user.balance -= betAmount
        await i.reply(
          `You picked **${side}** but the coin landed on **${winnerSide}** 😢 You Lost!\nYour new balance is now **${user.balance}**.`,
        );
      }

      collector.stop("answered");
    } catch (error) {
      console.error("Error handling button interaction:", error);
      
      // Try to respond if we haven't already
      if (!i.replied && !i.deferred) {
        try {
          await i.reply({
            content: "An error occurred while processing your choice.",
            flags: MessageFlags.Ephemeral,
          });
        } catch (replyError) {
          console.error("Failed to send error reply:", replyError);
        }
      }
    }
  });
  
  collector.on("end", async (collected, reason) => {
    try {
      // Use helper function to create disabled buttons
      const disabledRow = createButtons(true);
      
      await choice.edit({
        components: [disabledRow],
      });
    } catch (error) {
      console.error("Error disabling buttons:", error);
    }
  });
};

module.exports = {
  name: "coin-toss",
  description: "Toss a coin, win coins",
  options: [
    {
      name: "bet",
      description: "Your bet (e.g., 1, 10, 50, Half, All)",
      type: ApplicationCommandOptionType.String,
      required: true,
    },
  ],
  serverSpecific: true,
  callback: handleCoinToss,
};
