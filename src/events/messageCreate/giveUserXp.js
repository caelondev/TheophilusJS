const { Client, Message } = require("discord.js")
const Level = require("../../models/Level")
const calculateLevelXp = require("../../utils/calculateLevelXp")
const getRandomRange = require("../../utils/getRandomRange")
const mongoose = require("mongoose")

const cooldowns = new Set()
const processingUsers = new Set() // Prevent concurrent XP processing for same user

/**
 * Atomic level check and reset - processes level ups regardless of cooldown
 * @param {Object} query - User query object
 * @param {string} userTag - User tag for display
 * @returns {Object} - { leveledUp: boolean, newLevel: number, finalLevel: Object }
 */
const atomicLevelCheck = async (query, userTag) => {
  const session = await mongoose.startSession();
  
  try {
    let result = { leveledUp: false, newLevel: 0, finalLevel: null };
    
    await session.withTransaction(async () => {
      // Find user with session lock
      let userLevel = await Level.findOne(query).session(session);
      
      if (!userLevel) {
        // No user found, nothing to check
        return;
      }
      
      let currentLevel = userLevel.level;
      let remainingXp = userLevel.xp;
      let levelsGained = 0;
      
      // Process all possible level ups
      while (true) {
        const xpNeeded = calculateLevelXp(currentLevel);
        
        if (remainingXp >= xpNeeded) {
          remainingXp -= xpNeeded;
          currentLevel += 1;
          levelsGained++;
          result.leveledUp = true;
        } else {
          break;
        }
      }
      
      // If any level ups occurred, update atomically
      if (levelsGained > 0) {
        const updatedLevel = await Level.findOneAndUpdate(
          query,
          {
            $set: {
              xp: remainingXp, // Reset XP to remainder after level ups
              level: currentLevel,
              username: userTag,
              lastUpdated: new Date()
            }
          },
          {
            new: true,
            session,
            runValidators: true
          }
        );
        
        if (!updatedLevel) {
          throw new Error("Failed to update user level");
        }
        
        result.newLevel = currentLevel;
        result.finalLevel = updatedLevel;
      } else {
        result.finalLevel = userLevel;
      }
      
    }, {
      // Transaction options
      readConcern: { level: "majority" },
      writeConcern: { w: "majority" },
      maxCommitTimeMS: 10000
    });
    
    return result;
    
  } catch (error) {
    console.error("Atomic level check failed:", error);
    throw error;
  } finally {
    await session.endSession();
  }
};

/**
 * Atomic XP addition (only adds XP, doesn't process level ups)
 * @param {Object} query - User query object  
 * @param {number} xpToGive - XP amount to add
 * @param {string} userTag - User tag for display
 * @returns {Object} - Updated level object
 */
const atomicXpAdd = async (query, xpToGive, userTag) => {
  const session = await mongoose.startSession();
  
  try {
    let result = null;
    
    await session.withTransaction(async () => {
      // Try to update existing user
      const updatedLevel = await Level.findOneAndUpdate(
        query,
        {
          $inc: { xp: xpToGive },
          $set: { 
            username: userTag,
            lastUpdated: new Date()
          }
        },
        {
          new: true,
          session,
          runValidators: true,
          upsert: false // Don't create if doesn't exist
        }
      );
      
      if (updatedLevel) {
        result = updatedLevel;
      } else {
        // User doesn't exist, create new one
        const newLevel = new Level({
          userId: query.userId,
          username: userTag,
          guildId: query.guildId,
          xp: xpToGive,
          level: 1
        });
        
        result = await newLevel.save({ session });
      }
      
    }, {
      readConcern: { level: "majority" },
      writeConcern: { w: "majority" },
      maxCommitTimeMS: 10000
    });
    
    return result;
    
  } catch (error) {
    console.error("Atomic XP add failed:", error);
    throw error;
  } finally {
    await session.endSession();
  }
};
/**
 * Calculate balanced XP gain that doesn't scale exponentially
 * @param {number} userLevel - Current user level
 * @returns {number} XP to give (between min and max)
 */
const calculateXpGain = (userLevel) => {
  // Base XP range (10-25) with slight scaling for higher levels
  const baseMin = 5;
  const baseMax = 15;
  
  // Add small bonus for higher levels (max +10 XP at level 50+)
  const levelBonus = Math.min(Math.floor(userLevel / 10) * 2, 10);
  
  const minXp = baseMin + levelBonus;
  const maxXp = baseMax + levelBonus;
  
  return getRandomRange(minXp, maxXp);
}

/**
 * @param {Client} client
 * @param {Message} message
 * */

module.exports = async(client, message) => {
  if(!message.inGuild() || message.author.bot) return;

  const userId = message.author.id;
  const userKey = `${message.guild.id}-${userId}`;

  // Prevent concurrent processing for the same user
  if (processingUsers.has(userKey)) {
    return; // Silently ignore if already processing
  }

  const query = {
    userId: userId,
    guildId: message.guild.id
  }

  try {
    // Mark user as being processed
    processingUsers.add(userKey);

    // ALWAYS check for level ups first (regardless of cooldown)
    const levelCheckResult = await atomicLevelCheck(query, message.author.tag);
    
    // Send level up message if leveled up (regardless of cooldown)
    if (levelCheckResult.leveledUp) {
      const levelUpMessage = `**${message.member}** you have leveled up to **level ${levelCheckResult.newLevel}**! ` +
        `${levelCheckResult.newLevel === 69 ? "nice 😏" : ""}`;
      
      try {
        await message.channel.send(levelUpMessage);
      } catch (msgError) {
        console.log("Failed to send level up message:", msgError);
      }
    }

    // Only add XP if user is NOT on cooldown
    if (!cooldowns.has(userId)) {
      // Get current level for XP calculation
      const existingLevel = await Level.findOne(query);
      const currentLevel = existingLevel ? existingLevel.level : 1;
      
      // Calculate and add XP
      const xpToGive = calculateXpGain(currentLevel);
      await atomicXpAdd(query, xpToGive, message.author.tag);

      // Add cooldown after giving XP
      cooldowns.add(userId);
      setTimeout(() => {
        cooldowns.delete(userId);
      }, 60 * 1000); // 1 minute cooldown
    }

  } catch (error) {
    console.log(`Error in atomic level system for ${message.author.tag}:`, error);
  } finally {
    // Always remove processing lock
    processingUsers.delete(userKey);
  }
}
