/**
 * Created by caelondev
 * Licensed under the GNU AGPLv3
 * See LICENSE for details.
 */

const BotConfig = require("../../models/BotConfig")
const {
  Client,
  Interaction,
  EmbedBuilder
} = require("discord.js")

/**
 * @param {Client} client
 * @param {Interaction} interaction
 * */
const handleEnableAutoMessages = async(client, interaction) => {
  const autoMessageEmbed = new EmbedBuilder().setColor("Blurple").setTimestamp().setFooter({ text: `Disabled by ${interaction.user.displayName}`, iconURL: interaction.user.avatarURL() })
  try {
    await interaction.deferReply()
    const botConfig = await BotConfig.findOne({ guildId: interaction.guild.id })
    
    if(!botConfig) botConfig = await new BotConfig({ guildId: interaction.guild.id })
    if(botConfig.autoMessagesEnabled){
      autoMessageEmbed.setDescription("Auto-message is already enabled")
      return autoMessagesEmbed.setDescription({ embeds: [autoMessageEmbed] })
    }
    botConfig.autoMessagesEnabled = true
    await botConfig.save()

    autoMessageEmbed.setDescription("Successfully enabled auto-messages")
    interaction.editReply({ embeds: [autoMessageEmbed] })
  } catch (error) {
    console.log(error)
    autoMessageEmbed.setDescription("An error occurred whilst enabling auto-messages.").setColor("Red")
    interaction.editReply({ embeds: [autoMessageEmbed] })
  }
}

module.exports = {
  name: "enable-auto-messages",
  description: "Enable bot's auto messages",
  serverSpecific: true,
  channelIndependent: true,
  callback: handleEnableAutoMessages
}

