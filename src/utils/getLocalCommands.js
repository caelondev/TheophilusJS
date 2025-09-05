const path = require("path");
const getAllFiles = require("./getAllFiles");

module.exports = (exeptions = []) => {
  let localCommands = [];

  const commandCategories = getAllFiles(
    path.join(__dirname, "..", "commands"),
    true,
  );

  for(commandCategory of commandCategories){
    const commandFiles = getAllFiles(commandCategory)
    for (const commandFile of commandFiles){
      const commandObject = require(commandFile)
      
      if(exeptions.includes(commandObject.name)){
        continue
      }

      localCommands.push(commandObject)
    }
  }

  return localCommands;
};
