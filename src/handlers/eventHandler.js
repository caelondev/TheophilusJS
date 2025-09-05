const path = require("path")
const getAllFiles = require("../utils/getAllFiles.js")

module.exports = (client)=>{
  const eventFolders = getAllFiles(path.join(__dirname, "..", "events"), true)

  for(const eventFolder of eventFolders){
    const eventFiles = getAllFiles(eventFolder)
    eventFiles.sort((a, b)=>a>b) // sort files base on priority

    const eventName = eventFolder.replace(/\\/g, "/").split("/").pop() // format filepath and get last value

    client.on(eventName, async(args)=>{
      for(const eventFile of eventFiles){
        const eventFunction = require(eventFile)
        await eventFunction(client, args)
      }
    })
  }
}
