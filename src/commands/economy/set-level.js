/**
 * Created by caelondev
 * Licensed under the GNU AGPLv3
 * See LICENSE for details.
 */

const {
  Client,
  Interaction,
  ApplicationCommandOptionType,
  MessageFlags,
  PermissionFlagsBits,
} = require("discord.js");
const Level = require("../../models/Level")

/**
 * @param {Client} client
 * @param {Interaction} interaction
 * */
const handleSetLevel = async(client, interaction) => {
  const userOpt = interaction.options.get("user")
  const desiredLevelOpt = interaction.options.get("desired-level")
  
  await interaction.deferReply()
  
  if(desiredLevelOpt.value < 0){
    const err = interaction.editReply({
      content: "❌ You can’t set level below zero.",
      flags: MessageFlags.Ephemeral
    })
    setTimeout(()=>{interaction.deleteReply(err)}, 3000)
    return
  }

  if(userOpt.user.bot){
    const err = interaction.editReply({
      content: "❌ You can’t set a bot’s level.",
      flags: MessageFlags.Ephemeral
    })
    setTimeout(()=>{interaction.deleteReply(err)}, 3000)
    return
  }

  const query = {
    userId: userOpt.user.id,
    guildId: interaction.guild.id
  }

  const level = await Level.findOne(query)

  try {
    if(level){
      level.level = desiredLevelOpt.value
      await level.save()
      interaction.editReply(`✅ Successfully set **${userOpt.user.tag}**’s level to **${desiredLevelOpt.value}**.`)
    } else {
      const newLevel = await new Level({
        userId: userOpt.user.id,
        username: userOpt.user.tag,
        guildId: interaction.guild.id,
        level: desiredLevelOpt.value
      })
      await newLevel.save()
      interaction.editReply(`✅ Created level instance for **${userOpt.user.tag}** and set their level to **${desiredLevelOpt.value}**.`)
    }

  } catch (error) {
    interaction.editReply(`An error occured whilst editing **${userOpt.user.tag}**'s level.`)
    console.log(`An error occured whilst editing ${userOpt.user.tag}'s level: ${error}`)
  }
};

module.exports = {
  name: "set-level",
  description: "Manually set a member's level.",
  options: [
    {
      name: "user",
      description: "Select the member whose level you want to change.",
      type: ApplicationCommandOptionType.User,
      required: true,
    },
    {
      name: "desired-level",
      description: "Enter the level you want to assign.",
      type: ApplicationCommandOptionType.Integer,
      required: true,
    },
  ],
  serverSpecific: true,
  permissionsRequired: [PermissionFlagsBits.Administrator],
  callback: handleSetLevel,
};
