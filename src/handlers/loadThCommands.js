/**
 * Created by caelondev
 * Licensed under the GNU AGPLv3
 * See LICENSE for details.
 */

const path = require("path")
const getAllFiles = require("../utils/getAllFiles")
const fileExist = require("../utils/fileExists")

const loadedCommands = {}

const main = ()=>{
  const commandThPath = path.join(__dirname, "..", "commands-th")
  const commandCategories = getAllFiles(commandThPath, true)

  for(const category of commandCategories){
    const categoryName = category.replace(/\\/g, "/").split("/").pop()
    loadedCommands[categoryName] = []
    
    const commandFiles = getAllFiles(category)
    for(const commandFile of commandFiles){
      if(!commandFile.endsWith(".js")) continue
      loadedCommands[categoryName].push(commandFile)
    }
  }
  
}

module.exports = {
  main,
  loadedCommands
}
