module.exports = {
  name: "shutdown",
  description: 'Shut down',
  callback: async(client, message, args)=>{
    await message.reply(`Shutting down.`)
    process.exit(1)
  }
}
