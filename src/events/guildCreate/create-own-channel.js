/**
 * Created by caelondev
 * Licensed under the GNU AGPLv3
 * See LICENSE for details.
 */

const BotConfig = require("../../models/BotConfig");

module.exports = async (client, guild) => {
  async function ensureBotChannel(guild) {
    const me = await guild.members.fetchMe(); // up-to-date perms
    if (!me.permissions.has("Administrator")) {
      console.log(`⏭️ Skipping ${guild.name} — bot is not an Admin.`);
      return;
    }

    let botConfig = await BotConfig.findOne({ guildId: guild.id });
    if (!botConfig) {
      botConfig = new BotConfig({ guildId: guild.id });
    }

    let botChannel;

    // Check stored channel
    if (botConfig.channelId) {
      botChannel = guild.channels.cache.get(botConfig.channelId);
      if (!botChannel) {
        console.log(`⚠️ Stored channel not found in ${guild.name}, recreating...`);
        botConfig.channelId = null;
        botConfig.channelName = "";
      }
    }

    // Create channel if missing
    if (!botChannel) {
      const channelName =
        botConfig.channelName || `${client.user.username} cmds`.toLowerCase();

      const textCategory = guild.channels.cache.find(
        (ch) => ch.type === 4 && ch.name.toLowerCase().includes("text"),
      );

      botChannel = await guild.channels.create({
        name: channelName,
        type: 0, // text channel
        parent: textCategory?.id || null,
        reason: "Bot commands channel",
      });

      botConfig.channelId = botChannel.id;
      botConfig.channelName = botChannel.name;
      await botConfig.save();

      console.log(`✅ Created channel ${botChannel.name} in ${guild.name}`);
    } else if (botConfig.channelName !== botChannel.name) {
      botConfig.channelName = botChannel.name;
      await botConfig.save();
    }
  }

  // Just call it with the passed guild
  await ensureBotChannel(guild);
};
