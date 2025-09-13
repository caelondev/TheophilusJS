const { Client, Interaction, PermissionFlagsBits, MessageFlags } = require("discord.js")
const AutoRole = require("../../models/AutoRole")

/**
 * @param {Client} client
 * @param {Interaction} interaction
 * */
const handleDisableAutorole = async(client, interaction)=>{
  try {
    await interaction.deferReply()

    if(!(await AutoRole.exists({ guildId: interaction.guild.id }))){
      const err = interaction.editReply({
        content: "❌ Autorole hasn’t been configured! Type `/autorole-configure` to set it up.",
        flags: MessageFlags.Ephemeral
      })
      setTimeout(()=>{interaction.deleteReply(err)}, 3000)
      return
    }

    await AutoRole.findOneAndDelete({ guildId: interaction.guild.id })
    interaction.editReply('✅ Successfully disabled autorole! Type `/autorole-configure` to set it up again.')
  } catch (error) {
    console.log(`There was an error: ${error}`)
  }
}

module.exports = {
  name: 'autorole-disable',
  description: "Disable auto-role in this server.",
  permissionsRequired: [PermissionFlagsBits.Administrator],
  serverSpecific: true,
  callback: handleDisableAutorole
}
