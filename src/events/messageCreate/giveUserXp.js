const { Client, Message } = require("discord.js")
const Level = require("../../models/Level")
const calculateLevelXp = require("../../utils/calculateLevelXp")
const getRandomRange = require("../../utils/getRandomRange")

const cooldowns = new Set()

/**
 * @param {Client} client
 * @param {Message} message
 * */

module.exports = async(client, message) =>{
  if(!message.inGuild() || message.author.bot || cooldowns.has(message.author.id)) return;

  const query = {
    userId: message.author.id,
    guildId: message.guild.id
  }

  try {
    const level = await Level.findOne(query)

    if(level){
      // User exists, calculate XP based on their current level
      const xpToGive = getRandomRange(level.level, 15 * Math.sqrt(level.level))
      level.xp += xpToGive
      
      if(level.xp >= calculateLevelXp(level.level)){
        level.xp -= calculateLevelXp(level.level);
        level.level += 1

        if(level.level === 69){
          message.channel.send(`**${message.member}** you have leveled up to **level ${level.level}** nice 😏`)
        } else {
          message.channel.send(`**${message.member}** you have leveled up to **level ${level.level}**`)
        }
      }

      await level.save().catch((error)=>{
        console.log(`Error saving updated level ${error}`)
        return
      })

    } else { 
      // New user, calculate XP for level 1
      const xpToGive = getRandomRange(1, 15 * Math.sqrt(1)) // Start with level 1 calculations
      
      const newLevel = new Level({
        userId: message.author.id,
        username: message.author.tag,
        guildId: message.guild.id,
        xp: xpToGive,
        level: 1 // Make sure to set initial level
      })

      await newLevel.save().catch((error)=>{
        console.log(`Error whilst instantiating new level: ${error}`)
        return
      })
    }

    // Add cooldown after successful processing
    cooldowns.add(message.author.id)
    setTimeout(()=>{
      cooldowns.delete(message.author.id)
    }, 60 * 1000);

  } catch (error) {
    console.log(`There was an error leveling up ${message.author.tag}: ${error}`)
  }
}
