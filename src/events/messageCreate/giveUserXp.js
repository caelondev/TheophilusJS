const { Client, Message } = require("discord.js")
const Level = require("../../models/Level")
const calculateLevelXp = require("../../utils/calculateLevelXp")

const cooldowns = new Set()

const getRandomXp = (min, max)=>{
  min = Math.ceil(min)
  max = Math.floor(max)
  return Math.floor(Math.random() * (max - min + 1)) + min
}

/**
 * @param {Client} client
 * @param {Message} message
 * */

module.exports = async(client, message) =>{
  if(!message.inGuild() || message.author.bot || cooldowns.has(message.author.id)) return;

  const xpToGive = getRandomXp(5, 15)

  const query = {
    userId: message.author.id,
    guildId: message.guild.id
  }

  try {
    const level = await Level.findOne(query)

    if(level){
      level.xp += xpToGive
      if(level.xp > calculateLevelXp(level.level)){
        level.xp -= calculateLevelXp(level.level);
        level.level += 1

        if(level.level === 69){
          message.channel.send(`${message.member} you have leveled up to **level ${level.level}** nice 😏`)
        } else {
          message.channel.send(`${message.member} you have leveled up to **level ${level.level}**`)
        }
      }

      await level.save().catch((error)=>{
        console.log(`Error saving updated level ${error}`)
        return
      })

      cooldowns.add(message.author.id)
      setTimeout(()=>{
        cooldowns.delete(message.author.id)
      }, 60 * 1000);
      

    } else { // if(!level)
      const newLevel = await new Level({
        userId: message.author.id,
        username: message.author.tag,
        guildId: message.guild.id,
        xp: xpToGive
      })

      cooldowns.add(message.author.id)
      setTimeout(()=>{
        cooldowns.delete(message.author.id)
      }, 60 * 1000);

      await newLevel.save().catch((error)=>{
        console.log(`Error whilst instantiating new level: ${error}`)
        return
      })
    }
  } catch (error) {
    console.log(`There was an error leveling up ${message.author.tag}: ${error}`)
  }
}
