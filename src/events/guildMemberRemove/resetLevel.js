const { Client, GuildMember } = require("discord.js");
const Level = require("../../models/Level");

/**
 * @param {Client} client
 * @param {GuildMember} member
 */
module.exports = async (client, member) => {
  try {
    const record = await Level.findOne({ 
      guildId: member.guild.id, 
      userId: member.user.id 
    });

    if (!record) return;

    await Level.deleteOne({ 
      guildId: member.guild.id, 
      userId: member.user.id 
    });

  } catch (error) {
    console.log(`Error while deleting ${member.user.tag}'s level data: ${error}`);
  }
};
