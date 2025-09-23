
const {
  Client,
  Interaction,
  ApplicationCommandOptionType,
  EmbedBuilder,
  MessageFlags,
} = require("discord.js");
const capitalizeFirstLetter = require("../../utils/capitalizeFirstLetter");

const getEmbedsArray = (json, query, interaction)=>{
  const data = json.data
  if(data.length === 0){
    const errorEmbed = new EmbedBuilder().setDescription("No results found.")
    return [errorEmbed]
  }

  const embedsArray = []

  for(const image of data){
    embedsArray.push(
      new EmbedBuilder().setImage(image)
    )
  }

  embedsArray[0].setAuthor({ name: interaction.user.displayName, iconURL: interaction.user.avatarURL() }).setTitle(capitalizeFirstLetter(query)).setDescription(`images Related to "${query}"`)
  return embedsArray
}

/**
 * @param {Client} client
 * @param {Interaction} interaction
 * */
const handlePinterest = async(client, interaction)=>{
  const imageQuery = interaction.options.getString("image-query")
  const quantity = interaction.options.getNumber("quantity")

  if(quantity < 1 || !Number.isInteger(quantity)) return interaction.reply({
    content: "Your image quantity must be **greater than zero and is a valid integer.",
    flags: MessageFlags.Ephemeral
  })

  if(quantity > 10) return interaction.reply({
    content: "Max image quantity is 10.",
    flags: MessageFlags.Ephemeral
  })

  try {
    await interaction.deferReply()

    const response = await fetch(`https://rapido.zetsu.xyz/api/pin?search=${encodeURI(imageQuery)}&count=${quantity}`)
    
    if(!response.ok) throw new Error(`non-200 status code: ${response.status}`)

    const json = await response.json()

    const embedsArray = getEmbedsArray(json, imageQuery, interaction)

    await interaction.editReply({ embeds: embedsArray })
  } catch (error) {
    const errorEmbed = new EmbedBuilder().setColor("Red").setDescription(`An error occurred whilst looking for **"${imageQuery}"**`)
    interaction.editReply({ embeds: [errorEmbed] })
    console.log(error)
  }
}

module.exports = {
  name: "pinterest",
  description: "Search images",
  options: [
    {
      name: "image-query",
      description: "The image you want to browse",
      type: ApplicationCommandOptionType.String,
      required: true,
    },
    {
      name: "quantity",
      description: "The amount of images you want to search",
      type: ApplicationCommandOptionType.Number,
      required: true
    }
  ],
  cooldown: 10_000,
  callback: handlePinterest,
};
