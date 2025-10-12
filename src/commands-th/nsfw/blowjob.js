const {
  Client,
  Message,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  StringSelectMenuBuilder,
} = require("discord.js");
const fs = require("fs").promises
const getOption = require("../../utils/getOption");
const fetchUser = require("../../utils/fetchUser");
const downloadFile = require("../../utils/downloadFile");

const options = [
  {
    name: "user",
    required: true
  },
]

/**
 * @param {Client} client
 * @param {Message} message
 * */
const handleHelp = async (client, message) => {
  const blowjobEmbed = new EmbedBuilder().setColor("Blurple").setTimestamp().setFooter({ text: `Got a head from ${message.author.displayName}`, iconURL: message.author.avatarURL() })

  try {
    const user = getOption(options, "user")
    const userObj = await fetchUser(user, client)

    if(userObj.id === message.author.id) return message.reply("You can't give yourself a head")
    if(userObj.bot) return message.reply("You can't give bots a head")

    blowjobEmbed.setTitle(`${message.author} gave ${userObj} a head 😳`).setImage(`https://aryanapi.up.railway.app/api/blowjob`)
    await message.reply({ embeds: [blowjobEmbed] })

  } catch (error) {
    console.log(error);
  }
};

module.exports = {
  name: "blowjob",
  description: "Give someone a head",
  options,
  callback: handleHelp,
};

