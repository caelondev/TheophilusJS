const getConfig = require("../../utils/getConfig");  
const { developerCommandPrefix, developerCommandSuffix, devs } = getConfig();  
const getLocalCommands = require("../../utils/getLocalDeveloperCommands");  
const { Client, Message } = require("discord.js");  
  
/**  
 * @param {Client} client  
 * @param {Message} message  
 */  
module.exports = async (client, message) => {  
  if (message.author.bot) return;  
  
  // ✅ Check prefix & suffix  
  if (  
    !message.content.startsWith(developerCommandPrefix) ||  
    !message.content.endsWith(developerCommandSuffix)  
  ) {  
    return;  
  }  
  
  // ✂️ Slice out command body (remove prefix & suffix)  
  const raw = message.content  
    .slice(  
      developerCommandPrefix.length,  
      message.content.length - developerCommandSuffix.length,  
    )  
    .trim();  
  
  // 📦 Split into parts  
  const parts = raw.split(/\s+/);  
  const commandName = parts.shift()?.toLowerCase();  
  const params = parts;  
  
  // 📂 Load local commands  
  const localCommands = getLocalCommands();  
  
  try {  
    const commandObject = localCommands.find((cmd) => cmd.name === commandName);  
  
    if (!commandObject) return;  
  
    // 👨‍💻 Developer-only check  
    if (!devs.includes(message.author.id)) {  
      return message.reply(  
        "🚫 Only developers are allowed to run this command.",  
      );  
    }  
  
    // 🚀 Execute command  
    await commandObject.callback(client, message, params);  
    message.reply(`🚀 Successfully executed \`${commandName}\`! `);  
  } catch (error) {  
    console.error(`⚠️ Error running dev command: ${error}`);  
    message.reply("❌ There was an error executing that dev command.");  
  }  
};
