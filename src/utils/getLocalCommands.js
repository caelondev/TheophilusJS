const path = require("path");
const getAllFiles = require("./getAllFiles");

module.exports = (exeptions = []) => {
  let localCommands = [];

  const commandCategories = getAllFiles(
    path.join(__dirname, "..", "commands"),
    true,
  );

  for (const commandCategory of commandCategories) {
    // Filter to only .js files
    const commandFiles = getAllFiles(commandCategory).filter(file => file.endsWith(".js"));

    for (const commandFile of commandFiles) {
      const commandObject = require(commandFile);

      if (!commandObject.name || !commandObject.description) {
        console.warn(`⚠️ Skipping invalid command in ${commandFile}`);
        continue;
      }

      if (exeptions.includes(commandObject.name)) continue;

      localCommands.push(commandObject);
    }
  }

  return localCommands;
};
