const {
  Client,
  Interaction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType
} = require("discord.js")

const questionPrompt = async (resolve, reject, interaction, jokeEmbed, json) => {
  const jokeFlags = []
  if (json.flags && typeof json.flags === "object") {
    for (const [key, value] of Object.entries(json.flags)) {
      if (value) jokeFlags.push(key)
    }
  }

  const warningText =
    jokeFlags.length > 0
      ? `This joke is flagged as **[${jokeFlags.join(", ")}]**, Category: **${json.category}**`
      : `This joke has no specific flags but is still **unsafe**.`

  jokeEmbed
    .setColor("DarkButNotBlack")
    .setDescription(`**Warning:** Unsafe joke.\n${warningText}\n\nDo you wish to continue?`)

  const questionButtons = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("joke-continue")
      .setLabel("Continue")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("joke-exit")
      .setLabel("Exit")
      .setStyle(ButtonStyle.Danger)
  )

  const answer = await interaction.editReply({
    embeds: [jokeEmbed],
    components: [questionButtons]
  })

  const collector = answer.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 300_000 // 5m
  })

  collector.on("collect", async (interact) => {
    if (interact.user.id !== interaction.user.id) {
      if (!interact.replied && !interact.deferred) {
        const errorEmbed = new EmbedBuilder()
          .setColor("Red")
          .setDescription("You do not own this session, create your own by typing `/joke`.")
        return interact.reply({ embeds: [errorEmbed], ephemeral: true })
      }
      return
    }

    if (interact.customId === "joke-exit") {
      await interact.update({ components: [] })
      reject(false)
    } else if (interact.customId === "joke-continue") {
      await interact.update({ components: [] })
      resolve(true)
    }
  })
}

const notifyUser = async (interaction, jokeEmbed, json) => {
  return new Promise((res, rej) => questionPrompt(res, rej, interaction, jokeEmbed, json))
}

/**
 * @param {Client} client
 * @param {Interaction} interaction
 */
const handleJoke = async (client, interaction) => {
  const jokeEmbed = new EmbedBuilder().setColor("Blurple").setFooter({
    text: `Joke for ${interaction.user.displayName}`,
    iconURL: interaction.user.displayAvatarURL()
  })

  try {
    await interaction.deferReply()

    const response = await fetch(`https://urangkapolka.vercel.app/api/joke`)
    if (!response.ok) throw new Error("non-200 status code")

    const json = await response.json()
    if (!json) throw new Error("No response found")

    let userApproved = true
    if (!json.safe) {
      userApproved = await notifyUser(interaction, jokeEmbed, json)
    }

    if (!userApproved) {
      jokeEmbed
        .setDescription(`${interaction.user.displayName} rejected the joke.`)
        .setColor("White")
      return interaction.editReply({ embeds: [jokeEmbed], components: [] })
    }

    jokeEmbed.setDescription(json.joke).setTitle(`Category: ${json.category}`)
    if (!json.safe) jokeEmbed.setColor("DarkButNotBlack")

    await interaction.editReply({ embeds: [jokeEmbed], components: [] })
  } catch (error) {
    if(error === false){
      jokeEmbed
        .setDescription(`${interaction.user.displayName} rejected the joke.`)
        .setColor("White")
      return interaction.editReply({ embeds: [jokeEmbed], components: [] })
    }

    jokeEmbed
      .setDescription("❌ An error occurred whilst fetching a joke")
      .setColor("Red")
    await interaction.editReply({ embeds: [jokeEmbed], components: [] })
    console.error(error)
  }
}

module.exports = {
  name: "joke",
  description: "Sends a random joke",
  cooldown: 10000,
  callback: handleJoke
}
