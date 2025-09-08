const { Client, Interaction, ApplicationCommandOptionType, MessageFlags, PermissionFlagsBits } = require("discord.js")
const AutoRole = require("../../models/AutoRole")
const { permissionsRequired } = require("../misc/setLevel")

/**
 * @param {Client} client
 * @param {Interaction} interaction
 * */
const handleAutorole = async(client, interaction)=>{
  const targetRoleId = interaction.options.get("role").value

  try {
    await interaction.deferReply()

    const roleObj = interaction.guild.roles.cache.get(targetRoleId)
    
    if (!roleObj) {
      const errorMsg = await interaction.followUp({
        content: "❌ Role not found!",
        flags: MessageFlags.Ephemeral,
        fetchReply: true
      })
      setTimeout(() => {
        interaction.deleteReply(errorMsg.id).catch(() => {})
      }, 3000)
      return
    }

    const botMember = interaction.guild.members.cache.get(client.user.id)
    if (roleObj.position >= botMember.roles.highest.position) {
      const errorMsg = await interaction.followUp({
        content: `❌ I cannot assign the **${roleObj.name}** role because it's higher than or equal to my highest role in the hierarchy. Please move my role above it in Server Settings > Roles.`,
        flags: MessageFlags.Ephemeral,
        fetchReply: true
      })
      setTimeout(() => {
        interaction.deleteReply(errorMsg.id).catch(() => {})
      }, 3000)
      return
    }

    if (roleObj.managed) {
      const errorMsg = await interaction.followUp({
        content: `❌ The **${roleObj.name}** role is managed by another bot or integration and cannot be assigned as an autorole.`,
        flags: MessageFlags.Ephemeral,
        fetchReply: true
      })
      setTimeout(() => {
        interaction.deleteReply(errorMsg.id).catch(() => {})
      }, 3000)
      return
    }

    let autoRole = await AutoRole.findOne({ guildId: interaction.guild.id })
    
    if(autoRole){
      if(autoRole.roleId === targetRoleId){
        const errorMsg = await interaction.followUp({
          content: `❌ Autorole is already configured to **${roleObj.name}**! Type \`/autorole-disable\` to disable it.`,
          flags: MessageFlags.Ephemeral,
          fetchReply: true
        })
        setTimeout(() => {
          interaction.deleteReply(errorMsg.id).catch(() => {})
        }, 3000)
        return
      }

      autoRole.roleId = targetRoleId
      await autoRole.save()
      
      await interaction.editReply({
        content: `✅ Autorole updated to **${roleObj.name}**! Type \`/autorole-disable\` to disable it.`
      })
    } else {
      autoRole = new AutoRole({
        guildId: interaction.guild.id,
        roleId: targetRoleId
      })

      await autoRole.save()
      
      await interaction.editReply({
        content: `✅ Autorole is now configured to **${roleObj.name}**! Type \`/autorole-disable\` to disable it.`
      })
    }
  } catch (error) {
    console.log(`There was an error: ${error}`)
    
    const errorMsg = await interaction.followUp({
      content: "❌ An error occurred while configuring autorole.",
      flags: MessageFlags.Ephemeral,
      fetchReply: true
    })
    setTimeout(() => {
      interaction.deleteReply(errorMsg.id).catch(() => {})
    }, 3000)
  }
}

module.exports = {
  name: "autorole-configure",
  description: "Configure your auto-role for this server.",
  options: [
    {
      name: "role",
      description: "The initial role of new members.",
      type: ApplicationCommandOptionType.Role,
      required: true
    }
  ],
  permissionsRequired: [PermissionFlagsBits.Administrator],
  botPermissionsRequired: [PermissionFlagsBits.ManageRoles],
  serverSpecific: true,
  callback: handleAutorole
}
