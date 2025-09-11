const BotConfig = require("../../models/BotConfig");

module.exports = async (client) => {
  async function ensureBotChannel(guild) {
    const me = await guild.members.fetchMe(); // up-to-date perms
    if (!me.permissions.has("Administrator")) {
      console.log(`⏭️ Skipping ${guild.name} — bot is not an Admin.`);
      return;
    }

    // find or create bot config
    let botConfig = await BotConfig.findOne({ guildId: guild.id });
    if (!botConfig) {
      botConfig = new BotConfig({ guildId: guild.id });
    }

    let botChannel;

    // 1. If we already stored a channelId, check if that channel still exists
    if (botConfig.channelId) {
      botChannel = guild.channels.cache.get(botConfig.channelId);

      // channel got deleted
      if (!botChannel) {
        console.log(`⚠️ Stored channel not found in ${guild.name}, recreating...`);
        botConfig.channelId = null;
        botConfig.channelName = "";
      }
    }

    // 2. If no channelId or channel was deleted, create a new one
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
    } else {
      // Channel exists, make sure DB is up to date
      if (botConfig.channelName !== botChannel.name) {
        botConfig.channelName = botChannel.name;
        await botConfig.save();
      }
    }
  }

  for (const [guildId, guild] of client.guilds.cache) {
    await ensureBotChannel(guild);
  }
};
