const {
  Client,
  Interaction,
  EmbedBuilder
} = require("discord.js")
const { isUint8ClampedArray } = require("util/types")


/**
 * @param {Client} client
 * @param {Interaction} interaction
 * */
const handleRizz = async(client, interaction)=>{
  const rizzEmbed = new EmbedBuilder().setColor("Blurple").setFooter({ text: `Rizz for ${interaction.user.displayName}`, iconURL: interaction.user.avatarURL() })

  try {
    await interaction.deferReply()
    const response = await fetch(`https://golden-bony-solidstatedrive.vercel.app/random/rizz`)

    if(!response.ok) throw new Error("non-200 status code")

    const json = await response.json()

    if(!json) throw new Error("no rizz found")
    
    rizzEmbed.setDescription(json?.rizz)
    await interaction.editReply({ embeds: [rizzEmbed] })
  } catch (error) {
    rizzEmbed.setDescription("An error occurred whilst fetching datas. Try again later...").setColor("Red")
    await interaction.editReply({ embeds: [rizzEmbed] })
    console.log(error)
  }
}

module.exports = {
  name: "rizz",
  description: "Sends random rizz lines",
  cooldown: 5000,
  callback: handleRizz
}
