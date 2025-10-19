/**
 * Created by caelondev
 * Licensed under the GNU AGPLv3
 * See LICENSE for details.
 */

const { Client, GuildMember } = require("discord.js");
const User = require("../../models/User")
/**
 * @param {Client} client
 * @param {GuildMember} member
 */
module.exports = async (client, member) => {
  try {
    const record = await User.findOne({ 
      guildId: member.guild.id, 
      userId: member.user.id 
    });

    if (!record) return;

    await User.deleteOne({ 
      guildId: member.guild.id, 
      userId: member.user.id 
    });

  } catch (error) {
    console.log(`Error while deleting ${member.user.tag}'s level data: ${error}`);
  }
};
