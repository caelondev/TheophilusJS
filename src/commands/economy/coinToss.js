const {
  Client,
  Interaction,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  ComponentType,
  ApplicationCommandOptionType,
} = require("discord.js");
const capitalizeFirstLetter = require("../../utils/capitalizeFirstLetter");
const User = require("../../models/User");
const mongoose = require("mongoose");

// Track active games to prevent multiple concurrent games per user
const activeGames = new Set();

const tossCoin = () => (Math.random() < 0.5 ? "Heads" : "Tails");

const createButtons = (disabled = false) => {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel("Exit")
      .setStyle(ButtonStyle.Danger)
      .setCustomId("exit")
      .setDisabled(disabled),
    new ButtonBuilder()
      .setLabel("Heads")
      .setStyle(ButtonStyle.Primary)
      .setCustomId("heads")
      .setDisabled(disabled),
    new ButtonBuilder()
      .setLabel("Tails")
      .setStyle(ButtonStyle.Primary)
      .setCustomId("tails")
      .setDisabled(disabled)
  );
};

// Atomic database operation using MongoDB transactions
const atomicBalanceUpdate = async (query, balanceChange, betAmount) => {
  const session = await mongoose.startSession();
  
  try {
    await session.withTransaction(async () => {
      // Find user with pessimistic locking (for update)
      const user = await User.findOne(query).session(session);
      
      if (!user) {
        throw new Error("User not found");
      }

      // Check balance constraints
      const newBalance = user.balance + balanceChange;
      
      if (newBalance < 0) {
        throw new Error("Insufficient balance for this operation");
      }

      // Atomic update with session
      const updatedUser = await User.findOneAndUpdate(
        query,
        { 
          $inc: { balance: balanceChange },
          $set: { lastUpdated: new Date() }
        },
        { 
          new: true,
          session,
          runValidators: true
        }
      );

      if (!updatedUser) {
        throw new Error("Failed to update user balance");
      }

      // Final safety check
      if (updatedUser.balance < 0) {
        throw new Error("Balance update would result in negative balance");
      }

      return updatedUser;
    }, {
      // Transaction options
      readConcern: { level: "majority" },
      writeConcern: { w: "majority" },
      maxCommitTimeMS: 10000
    });

    // If we reach here, transaction was successful
    const finalUser = await User.findOne(query);
    return finalUser;

  } catch (error) {
    console.error("Transaction failed:", error.message);
    throw error;
  } finally {
    await session.endSession();
  }
};

// Validate bet amount with atomic balance check
const validateBetWithAtomicCheck = async (betOpt, query) => {
  // Get current user balance atomically
  const user = await User.findOne(query);
  if (!user) {
    throw new Error("User not found");
  }

  const userBalance = user.balance;
  let betAmount = parseFloat(betOpt);
  
  if (isNaN(betAmount)) {
    const lowerBetOpt = betOpt.toLowerCase();
    if (lowerBetOpt === "all") {
      betAmount = userBalance;
    } else if (lowerBetOpt === "half") {
      betAmount = Math.floor(userBalance * 0.5);
    } else {
      throw new Error('Invalid bet amount. Please enter a number, "all", or "half".');
    }
  }
  
  if (betAmount <= 0) {
    throw new Error("Bet amount must be greater than 0.");
  }
  
  if (betAmount > userBalance) {
    throw new Error("Your bet is higher than your current balance.");
  }
  
  return { betAmount, currentBalance: userBalance };
};

/**
 * @param {Client} client
 * @param {Interaction} interaction
 */
const handleCoinToss = async (client, interaction) => {
  if (interaction.user.bot) return;

  const userId = interaction.user.id;
  const guildId = interaction.guild.id;
  const gameKey = `${guildId}-${userId}`;

  // Atomic check and set for active games
  if (activeGames.has(gameKey)) {
    return interaction.reply({
      content: "❌ You already have an active coin toss game! Please finish it first.",
      ephemeral: true
    });
  }

  const betOpt = interaction.options.get("bet").value;
  const query = { guildId, userId };

  let choiceMessage = null;
  let collector = null;
  let gameActive = false;

  try {
    // Atomically mark game as active
    activeGames.add(gameKey);
    gameActive = true;

    // Get or create user atomically
    let user = await User.findOneAndUpdate(
      query,
      { $setOnInsert: { ...query, balance: 0, lastUpdated: new Date() } },
      { new: true, upsert: true }
    );

    if (user.balance <= 0) {
      throw new Error("You don't have enough balance to play.");
    }

    // Validate bet atomically with current balance
    let betAmount, currentBalance;
    try {
      const validation = await validateBetWithAtomicCheck(betOpt, query);
      betAmount = validation.betAmount;
      currentBalance = validation.currentBalance;
    } catch (error) {
      throw new Error(error.message);
    }

    // Show betting message
    await interaction.reply(`💰 Your bet is: **${betAmount}** coins (Balance: **${currentBalance}** coins)`);

    choiceMessage = await interaction.followUp({
      content: `🎲 Pick a side, ${interaction.user}! You have 60 seconds to choose.`,
      components: [createButtons(false)],
      fetchReply: true,
    });

    collector = choiceMessage.createMessageComponentCollector({
      componentType: ComponentType.Button,
      filter: (i) => i.user.id === interaction.user.id,
      time: 60000,
    });

    let gameProcessed = false; // Atomic flag to prevent multiple game resolutions

    collector.on("collect", async (i) => {
      try {
        // Atomic check-and-set for game processing
        if (gameProcessed) {
          if (!i.replied && !i.deferred) {
            await i.deferUpdate();
            await i.followUp({ content: "⚠️ Game already processed!", ephemeral: true });
          }
          return;
        }

        // Atomically mark as processed
        gameProcessed = true;

        // Defer update immediately
        if (!i.deferred && !i.replied) {
          await i.deferUpdate();
        }

        if (i.customId === "exit") {
          await i.followUp("🛑 Game cancelled! No coins were lost or gained.");
          collector.stop("exit");
          return;
        }

        if (i.customId !== "heads" && i.customId !== "tails") {
          await i.followUp("❌ Invalid choice! Game cancelled.");
          collector.stop("invalid");
          return;
        }

        const side = capitalizeFirstLetter(i.customId);
        const winnerSide = tossCoin();
        const won = side === winnerSide;

        // Atomic balance update using transaction
        try {
          const balanceChange = won ? betAmount : -betAmount;
          const updatedUser = await atomicBalanceUpdate(query, balanceChange, betAmount);
          
          if (won) {
            await i.followUp({
              content: `🎉 ${i.user} picked **${side}** and the coin landed on **${winnerSide}**!\n` +
                      `✅ You won **${betAmount}** coins!\n` +
                      `💰 Your new balance is **${updatedUser.balance}** coins.`,
            });
          } else {
            await i.followUp({
              content: `😢 ${i.user} picked **${side}** but the coin landed on **${winnerSide}**.\n` +
                      `❌ You lost **${betAmount}** coins.\n` +
                      `💰 Your new balance is **${updatedUser.balance}** coins.`,
            });
          }
        } catch (balanceError) {
          console.error("Atomic balance update failed:", balanceError);
          
          let errorMessage = "⚠️ Transaction failed: ";
          if (balanceError.message.includes("Insufficient balance")) {
            errorMessage += "Your balance changed during the game. Please try again.";
          } else if (balanceError.message.includes("User not found")) {
            errorMessage += "User data not found. Please try again.";
          } else {
            errorMessage += "Database operation failed. Please contact an administrator.";
          }
          
          await i.followUp(errorMessage);
        }

        collector.stop("answered");
      } catch (error) {
        gameProcessed = true;
        console.error("Error processing coin toss interaction:", error);
        
        try {
          if (!i.replied && !i.deferred) {
            await i.deferUpdate();
          }
          
          await i.followUp({
            content: "⚠️ An unexpected error occurred during game processing. Please try again.",
            ephemeral: true
          });
        } catch (followUpError) {
          console.error("Error sending error follow-up:", followUpError);
        }
        
        collector.stop("error");
      }
    });

    collector.on("end", async (collected, reason) => {
      try {
        // Atomically clean up active game tracking
        if (gameActive) {
          activeGames.delete(gameKey);
          gameActive = false;
        }
        
        // Disable buttons atomically
        if (choiceMessage) {
          try {
            await choiceMessage.edit({ components: [createButtons(true)] });
          } catch (editError) {
            console.error("Error disabling buttons:", editError);
          }
        }
        
        // Send timeout message if needed
        if (reason === "time" && !gameProcessed) {
          try {
            await interaction.followUp("⏰ Game timed out! No coins were lost or gained.");
          } catch (timeoutError) {
            console.error("Error sending timeout message:", timeoutError);
          }
        }
        
      } catch (error) {
        console.error("Error in collector end event:", error);
      }
    });

  } catch (error) {
    // Atomic cleanup on any error during setup
    if (gameActive) {
      activeGames.delete(gameKey);
      gameActive = false;
    }
    
    console.error("Error in handleCoinToss setup:", error);
    
    // Clean up collector if it was created
    if (collector && !collector.ended) {
      collector.stop("error");
    }
    
    try {
      let errorMessage = "⚠️ Game setup failed: ";
      
      if (error.message.includes("balance")) {
        errorMessage += error.message;
      } else if (error.message.includes("bet")) {
        errorMessage += error.message;
      } else if (error.message.includes("Missing Permissions")) {
        errorMessage += "The bot doesn't have the required permissions.";
      } else {
        errorMessage += "Please try again in a moment.";
      }
      
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: errorMessage, ephemeral: true });
      } else {
        await interaction.followUp({ content: errorMessage, ephemeral: true });
      }
    } catch (replyError) {
      console.error("Error sending error reply:", replyError);
    }
  }
};

// Utility function to clean up stale active games (optional)
const cleanupStaleActiveGames = () => {
  // You could implement logic here to remove games that have been active too long
  // This is optional since games have built-in timeouts
  console.log(`Active games: ${activeGames.size}`);
};

// Optional: Set up periodic cleanup
// setInterval(cleanupStaleActiveGames, 300000); // Clean up every 5 minutes

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