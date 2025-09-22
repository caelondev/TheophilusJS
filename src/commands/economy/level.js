const { Client, Interaction, ApplicationCommandOptionType, MessageFlags, AttachmentBuilder } = require("discord.js");
const Level = require("../../models/Level");
const { RankCardBuilder, Font } = require("canvacord");
const calculateLevelXp = require("../../utils/calculateLevelXp");

/**
 * @param {Client} client
 * @param {Interaction} interaction
 */
const handleLevel = async (client, interaction) => {
  await interaction.deferReply();

  const mentionedUserId = interaction.options.get("target-user")?.user.id;
  const targetUserId = mentionedUserId || interaction.member.id;
  const targetUserObj = await interaction.guild.members.fetch(targetUserId);

  const fetchedLevel = await Level.findOne({
    userId: targetUserId,
    guildId: interaction.guild.id,
  });

  if (!fetchedLevel) {
    return interaction.editReply({
      content: mentionedUserId
        ? `❌ **${targetUserObj.user.tag}** does not have any levels yet!`
        : `❌ You do not have any levels yet!`,
      flags: MessageFlags.Ephemeral,
    });
  }

  let allLevels = await Level.find({ guildId: interaction.guild.id }).select(
    "-_id userId level xp",
  );

  allLevels.sort((a, b) => {
    if (a.level === b.level) {
      return b.xp - a.xp;
    } else {
      return b.level - a.level;
    }
  });

  let currentRank =
    allLevels.findIndex((lvl) => lvl.userId === targetUserId) + 1;

  // Load default font
  await Font.loadDefault();

  const rank = new RankCardBuilder()
    .setDisplayName(targetUserObj.user.displayName || targetUserObj.user.username)
    .setUsername(`@${targetUserObj.user.username}`)
    .setAvatar(targetUserObj.user.displayAvatarURL({ extension: 'png', size: 256 }))
    .setCurrentXP(fetchedLevel.xp)
    .setRequiredXP(calculateLevelXp(fetchedLevel.level)) // Usually next level's required XP
    .setLevel(fetchedLevel.level)
    .setRank(currentRank)
    .setStatus(targetUserObj.presence?.status || "offline");

  // Optional: Customize colors
  rank.setStyles({
    progressbar: {
      thumb: {
        style: {
          backgroundColor: "#FFC300"
        }
      }
    }
  });

  const data = await rank.build({ format: "png" });
  const attachment = new AttachmentBuilder(Buffer.from(data), { name: 'rank-card.png' });
  
  await interaction.editReply({ files: [attachment] });
};

module.exports = {
  name: "level",
  description: "Shows your/someone's level.",
  options: [
    {
      name: "target-user",
      description: "The user whose level you want to see.",
      type: ApplicationCommandOptionType.User,
    },
  ],
  cooldown: 10_000,
  serverSpecific: true,
  callback: handleLevel,
};
