const { MessageFlags, Message } = require("discord.js")
const getConfig = require("../../utils/getConfig")
const { devs, testServer } = getConfig()
const getLocalCommands = require("../../utils/getLocalCommands")

module.exports = async(client, interaction)=>{
  if(!interaction.isChatInputCommand) return

  const localCommands = getLocalCommands()

  try{
    const commandObject = localCommands.find(
      (cmd) => cmd.name === interaction.commandName
    )

    if(!commandObject) return

    if(commandObject.devOnly){
      if(!devs.includes(interaction.member.id)){
        interaction.reply({
          content: `❌ You do not have permission to run this command.
This command is restricted to bot developers only.`,
          flags: MessageFlags.Ephemeral
        })
        return
      }
    }
    if(commandObject.testOnly){
      if(!testServers.includes(interaction.guild.id)){
        interaction.reply({
          content: `❌ This command cannot be ran here.`,
          flags: MessageFlags.Ephemeral
        })
        return
      }
      
    if(commandObject.permissionsRequired?.length){
        for(const permission of commandObject.permissionsRequired){
          if(!interaction.member.permissions.has(permission)){
            interaction.reply({
              content: `❌ You don’t have permission to use this command.`,
              flags: MessageFlags.Ephemeral
            })
            break
          }
        }
      }
    }

    if(commandObject.botPermissionsRequired?.length){
      for(const permission of commandObject.botPermissionsRequired){
        const bot = interaction.guild.members.me
        
        if(!bot.permission.has(permission)){
          interaction.reply({
            content: "❌ I don’t have permission to execute this command.",
            flags: MessageFlags.Ephemeral
          })
          return
        }
      }

    }

    await commandObject.callback(client, interaction)
  } catch(error){
    console.log(`There was an error running this command: ${error}`)
  }
}
