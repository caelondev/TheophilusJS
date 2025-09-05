module.exports = {
  name: "ping",
  description: "Pong!",
  // devOnly: boolean
  // testOnly: boolean
  // options: Array[Object]
  // deleted: boolean

  callback: async(client, interaction)=>{
    await interaction.reply(`**Pong! ${client.ws.ping}ms**`)
    
  }
}
