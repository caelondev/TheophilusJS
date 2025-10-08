const {
  Client,
  Interaction,
  EmbedBuilder,
  ApplicationCommandOptionType,
  MessageFlags,
  PermissionFlagsBits,
} = require("discord.js");

/**
 * @param {Client} client
 * @param {Interaction} interaction
 * */
const handleAnnounce = async (client, interaction) => {
  const title = interaction.options.getString("title");
  const message = interaction.options.getString("message");
  let channel = interaction.options.getChannel("channel");
  const announceEmbed = new EmbedBuilder()
    .setColor("Blurple")
    .setTimestamp()
    .setFooter({
      text: `Announcement by ${interaction.user.displayName}`,
      iconURL: interaction.user.avatarURL(),
    });

  if (!channel) channel = interaction.channel;

  try {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    announceEmbed.setTitle(title).setDescription(message);
    await channel.send({ embeds: [announceEmbed] });
    interaction.editReply({
      content: `Successfully sent an announcement to channel ${channel}`,
      flags: MessageFlags.Ephemeral,
    });
  } catch (error) {
    console.log(error);
    announceEmbed
      .setDescription("An error occurred whilst sending the announcement.")
      .setColor("Red");
    interaction.editReply({ embeds: [announceEmbed] });
  }
};

module.exports = {
  name: "announce",
  description: "Announce a message",
  options: [
    {
      name: "title",
      description: "Announcement title",
      type: ApplicationCommandOptionType.String,
      required: true,
    },
    {
      name: "message",
      description: "The message you want to announce",
      type: ApplicationCommandOptionType.String,
      required: true,
    },
    {
      name: "channel",
      description: "The channel you want to post this announcement in",
      type: ApplicationCommandOptionType.Channel,
    },
  ],
  permissionsRequired: [PermissionFlagsBits.ModerateMembers],
  serverSpecific: true,
  channelIndependent: true,
  callback: handleAnnounce,
};
