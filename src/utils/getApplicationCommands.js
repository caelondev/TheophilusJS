/**
 * Created by caelondev
 * Licensed under the GNU AGPLv3
 * See LICENSE for details.
 */

module.exports = async(client, guildId)=>{
  let applicationCommands;
  
  if(guildId){
    const guild = await client.guilds.fetch(guildId)
    applicationCommands = guild.commands
  } else {
    applicationCommands = await client.application.commands
  } 

  await applicationCommands.fetch()
  return applicationCommands
}
