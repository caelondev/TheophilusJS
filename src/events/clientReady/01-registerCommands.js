const getConfig = require("../../utils/getConfig");
const { testServer } = getConfig();
const drawLine = require("../../utils/drawLine")
const areCommandsDifferent = require('../../utils/areCommandsDifferent');
const getApplicationCommands = require('../../utils/getApplicationCommands');
const getLocalCommands = require('../../utils/getLocalCommands');

module.exports = async (client) => {
  try {
    const localCommands = getLocalCommands();
    const applicationCommands = await getApplicationCommands(
      client,
      testServer
    );

    // Handle local commands (existing logic)
    for (const localCommand of localCommands) {
      const { name, description, options } = localCommand;

      const existingCommand = await applicationCommands.cache.find(
        (cmd) => cmd.name === name
      );

      if (existingCommand) {
        if (localCommand.deleted) {
          await applicationCommands.delete(existingCommand.id);
          drawLine()
          console.log(`🗑 Deleted command "${name}".`);
          continue;
        }

        if (areCommandsDifferent(existingCommand, localCommand)) {
          await applicationCommands.edit(existingCommand.id, {
            description,
            options,
          });
          drawLine()
          console.log(`🔁 Edited command "${name}".`);
        }
      } else {
        if (localCommand.deleted) {
          drawLine()
          console.log(
            `⏩ Skipping registering command "${name}" as it's set to delete.`
          );
          continue;
        }

        await applicationCommands.create({
          name,
          description,
          options,
        });
        drawLine()
        console.log(`👍 Registered command "${name}".`);
      }
    }

    // Handle application commands that don't exist locally (new logic)
    for (const applicationCommand of applicationCommands.cache.values()) {
      const localCommand = localCommands.find(
        (cmd) => cmd.name === applicationCommand.name
      );

      if (!localCommand) {
        await applicationCommands.delete(applicationCommand.id);
        drawLine()
        console.log(`🗑 Unregistered command "${applicationCommand.name}" (not found locally).`);
      }
    }

  } catch (error) {
    console.log(`There was an error: ${error}`);
  }
};
