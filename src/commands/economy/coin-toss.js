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

// Track active games to prevent multiple concurrent games per user
const activeGames = new Set();

// Track processing states to prevent duplicate operations
const processingStates = new Map();

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

// Enhanced safe database update with better retry logic and locking
const safeUpdateUserBalance = async (query, balanceChange, betAmount, maxRetries = 5) => {
  const lockKey = `${query.guildId}-${query.userId}`;
  
  // Check if already processing an update for this user
  if (processingStates.has(lockKey)) {
    throw new Error("Another operation is already processing for this user");
  }
  
  // Set processing lock
  processingStates.set(lockKey, true);
  
  try {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // First, verify the user still has enough balance for losses
        if (balanceChange < 0) {
          const currentUser = await User.findOne(query);
          if (!currentUser || currentUser.balance < Math.abs(balanceChange)) {
            throw new Error("Insufficient balance for this operation");
          }
        }
        
        const updatedUser = await User.findOneAndUpdate(
          query,
          { $inc: { balance: balanceChange } },
          { 
            new: true,
            runValidators: true,
            maxTimeMS: 10000 // 10 second timeout
          }
        );
        
        if (!updatedUser) {
          throw new Error("User not found during update");
        }
        
        // Verify the update was successful and balance is valid
        if (updatedUser.balance < 0) {
          // Rollback the change if balance went negative
          await User.findOneAndUpdate(
            query,
            { $inc: { balance: -balanceChange } },
            { new: true }
          );
          throw new Error("Operation would result in negative balance");
        }
        
        return updatedUser;
      } catch (error) {
        console.log(`Attempt ${attempt}/${maxRetries} failed:`, error.message);
        
        if (error.message.includes("ParallelSaveError") && attempt < maxRetries) {
          // Exponential backoff with jitter to reduce thundering herd
          const baseDelay = 100 * Math.pow(2, attempt - 1);
          const jitter = Math.random() * 50; // Add up to 50ms random jitter
          const delay = Math.min(baseDelay + jitter, 2000); // Cap at 2 seconds
          
          console.log(`Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        throw error;
      }
    }
    
    throw new Error(`Failed to update user balance after ${maxRetries} attempts`);
  } finally {
    // Always remove the processing lock
    processingStates.delete(lockKey);
  }
};

// Validate bet amount
const validateBet = (betOpt, userBalance) => {
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
  
  return betAmount;
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

  // Check if user already has an active game
  if (activeGames.has(gameKey)) {
    return interaction.reply({
      content: "❌ You already have an active coin toss game! Please finish it first.",
      flags: ['Ephemeral'] // Updated from ephemeral: true to fix deprecation warning
    });
  }

  const betOpt = interaction.options.get("bet").value;
  const query = { guildId, userId };

  let choiceMessage = null;
  let collector = null;

  try {
    // Mark game as active
    activeGames.add(gameKey);

    // Get or create user
    let user = await User.findOne(query);
    if (!user) {
      user = await User.create({ ...query, balance: 0 });
    }

    if (user.balance <= 0) {
      activeGames.delete(gameKey);
      return interaction.reply("❌ You don't have enough balance to play.");
    }

    // Validate and parse bet
    let betAmount;
    try {
      betAmount = validateBet(betOpt, user.balance);
    } catch (error) {
      activeGames.delete(gameKey);
      return interaction.reply(`❌ ${error.message}`);
    }

    // Show betting message
    await interaction.reply(`💰 Your bet is: **${betAmount}** coins`);

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

    let gameProcessed = false; // Prevent multiple game resolutions

    collector.on("collect", async (i) => {
      try {
        // Prevent multiple button clicks
        if (gameProcessed) {
          if (!i.replied && !i.deferred) {
            await i.deferReply({ flags: ['Ephemeral'] });
            await i.followUp({ content: "⚠️ Game already processed!", flags: ['Ephemeral'] });
          }
          return;
        }

        // Defer reply immediately to prevent timeout
        if (!i.deferred && !i.replied) {
          await i.deferReply();
        }

        if (i.customId === "exit") {
          gameProcessed = true;
          await i.followUp("🛑 Game cancelled! No coins were lost or gained.");
          collector.stop("exit");
          return;
        }

        if (i.customId !== "heads" && i.customId !== "tails") {
          gameProcessed = true;
          await i.followUp("❌ Invalid choice! Game cancelled.");
          collector.stop("invalid");
          return;
        }

        // Mark as processed to prevent duplicate clicks
        gameProcessed = true;

        const side = capitalizeFirstLetter(i.customId);
        const winnerSide = tossCoin();
        const won = side === winnerSide;


        try {
          let updatedUser;
          if (won) {
            updatedUser = await safeUpdateUserBalance(query, betAmount, betAmount);
            await i.followUp({
              content: `🎉 ${i.user} picked **${side}** and the coin landed on **${winnerSide}**!\n` +
                      `✅ You won **${betAmount}** coins!\n` +
                      `💰 Your new balance is **${updatedUser.balance}** coins.`,
            });
          } else {
            updatedUser = await safeUpdateUserBalance(query, -betAmount, betAmount);
            await i.followUp({
              content: `😢 ${i.user} picked **${side}** but the coin landed on **${winnerSide}**.\n` +
                      `❌ You lost **${betAmount}** coins.\n` +
                      `💰 Your new balance is **${updatedUser.balance}** coins.`,
            });
          }
        } catch (balanceError) {
          console.error("Error updating user balance:", balanceError);
          
          let errorMessage = "⚠️ An error occurred while updating your balance. ";
          if (balanceError.message.includes("Insufficient balance")) {
            errorMessage += "It appears your balance changed during the game. Please try again.";
          } else if (balanceError.message.includes("Another operation")) {
            errorMessage += "Another game operation is in progress. Please wait and try again.";
          } else {
            errorMessage += "Please contact an administrator if this continues.";
          }
          
          await i.followUp(errorMessage);
        }

        collector.stop("answered");
      } catch (error) {
        gameProcessed = true;
        console.error("Error processing coin toss interaction:", error);
        
        try {
          if (!i.replied && !i.deferred) {
            await i.deferReply();
          }
          
          let errorMessage = "⚠️ An unexpected error occurred. ";
          if (error.message.includes("time")) {
            errorMessage += "The operation timed out. Please try again.";
          } else {
            errorMessage += "Please try again in a moment.";
          }
          
          await i.followUp(errorMessage);
        } catch (followUpError) {
          console.error("Error sending error follow-up:", followUpError);
        }
        
        collector.stop("error");
      }
    });

    collector.on("end", async (collected, reason) => {
      try {
        // Clean up active game tracking
        activeGames.delete(gameKey);
        
        // Disable buttons if message still exists
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
    // Clean up on any error during setup
    activeGames.delete(gameKey);
    console.error("Error in handleCoinToss setup:", error);
    
    // Clean up collector if it was created
    if (collector && !collector.ended) {
      collector.stop("error");
    }
    
    try {
      let errorMessage = "⚠️ An error occurred while starting the game. ";
      
      if (error.message.includes("Missing Permissions")) {
        errorMessage += "The bot doesn't have the required permissions.";
      } else if (error.message.includes("Unknown")) {
        errorMessage += "Please try again.";
      } else {
        errorMessage += "Please try again in a moment.";
      }
      
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply(errorMessage);
      } else {
        await interaction.followUp(errorMessage);
      }
    } catch (replyError) {
      console.error("Error sending error reply:", replyError);
    }
  }
};

// Clean up function to remove stale processing states (optional, call periodically)
const cleanupStaleProcessingStates = () => {
  const now = Date.now();
  for (const [key, timestamp] of processingStates.entries()) {
    if (typeof timestamp === 'boolean' || (now - timestamp) > 30000) { // 30 second cleanup
      processingStates.delete(key);
    }
  }
};

// Optional: Set up periodic cleanup (uncomment if you want automatic cleanup)
// setInterval(cleanupStaleProcessingStates, 60000); // Clean up every minute

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
