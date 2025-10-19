/**
 * Created by caelondev
 * Licensed under the GNU AGPLv3
 * See LICENSE for details.
 */

const { Client, Interaction, MessageFlags, AttachmentBuilder } = require("discord.js");
const Level = require("../../models/Level");
const { LeaderboardBuilder, Font } = require("canvacord");

/**
 * @param {Client} client
 * @param {Interaction} interaction
 */
const handleRank = async (client, interaction) => {
  await interaction.deferReply();

  // Fetch top 10 levels
  let allLevels = await Level.find({ guildId: interaction.guild.id })
    .select("-_id userId level xp")
    .limit(10);

  // Sort: highest level, then XP
  allLevels.sort((a, b) => {
    if (a.level === b.level) return b.xp - a.xp;
    return b.level - a.level;
  });

  if (allLevels.length === 0) {
    return interaction.editReply({
      content: "❌ No users have any levels yet in this server!",
      flags: MessageFlags.Ephemeral,
    });
  }

  await Font.loadDefault();

  const players = [];

  for (let i = 0; i < allLevels.length; i++) {
    const levelData = allLevels[i];
    try {
      const member = await interaction.guild.members.fetch(levelData.userId);

      // Safe avatar URL
      const avatarUrl =
        member.user.displayAvatarURL({
          extension: "png",
          size: 256,
          forceStatic: true,
        }) || "https://cdn.discordapp.com/embed/avatars/0.png";

      players.push({
        avatar: avatarUrl,
        displayName: member.displayName || member.user.username,
        username: member.user.username,
        level: levelData.level,
        xp: levelData.xp,
        rank: i + 1,
      });
    } catch (error) {
      console.log(`Could not fetch user ${levelData.userId}:`, error.message);
      continue;
    }
  }

  // Guild icon fallback
  const guildIcon =
    interaction.guild.iconURL({ extension: "png", size: 256, forceStatic: true }) ||
    "https://cdn.discordapp.com/embed/avatars/0.png";

  // Build leaderboard in STACK layout
  const leaderboard = new LeaderboardBuilder()
    .setHeader({
      title: `🏆 ${interaction.guild.name} Leaderboard`,
      subtitle: "Top Level Rankings",
      image: guildIcon,
    })
    .setPlayers(players)
    .setStyle({
      // 👇 this makes each player display as a stacked card
      layout: "stack", // other value is "table"
      backgroundColor: "#1e1e2e",
      borderRadius: 20,
      player: {
        backgroundColor: "#2a2a3c",
        borderRadius: 15,
        barColor: "#5865F2",
        barBackgroundColor: "#3a3a4d",
      },
    });

  try {
    const data = await leaderboard.build({ format: "png" });
    const attachment = new AttachmentBuilder(data, { name: "leaderboard.png" });
    await interaction.editReply({ files: [attachment] });
  } catch (error) {
    console.error("Error building leaderboard:", error);
    await interaction.editReply({
      content: "❌ There was an error generating the leaderboard. Please try again later.",
      flags: MessageFlags.Ephemeral,
    });
  }
};

module.exports = {
  name: "rank",
  description: "Shows the server's level leaderboard (top 10 users).",
  cooldown: 10_000,
  serverSpecific: true,
  callback: handleRank,
};
