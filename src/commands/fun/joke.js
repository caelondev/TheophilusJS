const {
  Client,
  Interaction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  ApplicationCommandOptionType,
  MessageFlags
} = require("discord.js")

const getJokeFlags = (json)=>{
  if(json.safe) return

  const flags = []

  for(const [key, value] of Object.entries(json.flags)){
    if(value) flags.push(key)
  }

  return flags
}

const notifyUser = async (json, interaction) => {
  return new Promise(async (resolve, reject) => {
    const jokeFlags = getJokeFlags(json);

    let notifyMessageDetail = "";
    if (!jokeFlags || jokeFlags.length === 0) {
      notifyMessageDetail =
        "This joke has **no specified flags** but is still marked as **unsafe.** If you continue, it may contain **dark or potentially offensive content**";
    } else {
      notifyMessageDetail = `This joke is flagged as **[${jokeFlags.join(", ")}]**`;
    }

    let notifyMessageToast = `Warning! ${notifyMessageDetail}. Do you wish to continue?`;

    const notificationEmbed = new EmbedBuilder()
      .setColor("DarkButNotBlack")
      .setTitle("⚠️ Warning")
      .setDescription(notifyMessageToast);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("joke-exit")
        .setLabel("Exit")
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId("joke-continue")
        .setLabel("Continue")
        .setStyle(ButtonStyle.Primary),
    );

    const reply = await interaction.editReply({
      embeds: [notificationEmbed],
      components: [row],
    });

    const collector = reply.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 300_000,
    });

    collector.on("collect", async (interact) => {
      const emitter = interact.user;
      const initializer = interaction.user;
      if (emitter.id !== initializer.id) {
        return interact.reply({
          embeds: [
            new EmbedBuilder()
              .setColor("Red")
              .setDescription("This is not your `/joke` session."),
          ],
          flags: MessageFlags.Ephemeral,
        })
      }

      if (interact.customId === "joke-exit") return collector.stop("exit")
      if (interact.customId === "joke-continue") return resolve();
    });

    collector.on("end", (_, reason) => {
      if (reason === "time") return reject("Session timeout");
      if (reason === "exit") return reject("User rejected the joke");
    });
  });
};

const handleTwoPart = async(json, interaction, jokeEmbed) => {
  const setup = json.setup
  const delivery = json.delivery
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("joke-next").setLabel("Show punchline").setStyle(ButtonStyle.Primary)
  )

  const twopartEmbed = jokeEmbed.setDescription(setup).setTitle(`Category: ${json.category}`)
  const reply = await interaction.editReply({ embeds: [twopartEmbed], components: [row] })
  const collector = reply.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 120_000,
  })      
  
  collector.on("collect", async(interact)=>{
    if(interaction.user.id !== interact.user.id){
      return interact.reply({
        embeds: [
          new EmbedBuilder()
          .setColor("Red")
          .setDescription("This is not your `/joke` session."),
        ],
        flags: MessageFlags.Ephemeral,
      })
    }

    twopartEmbed.setDescription(delivery).setTitle(null)
    await interaction.editReply({ components: [] })
    interact.reply({ embeds: [twopartEmbed] })
  })

  collector.on("end", ()=>{throw new Error("Session timeout")})
}

/**
 * @param {Client} client
 * @param {Interaction} interaction
 */
const handleJoke = async (client, interaction) => {
  const category = interaction.options.getString("category") || "Any"
  const jokeEmbed = new EmbedBuilder().setColor("Blurple").setFooter({
    text: `Joke for ${interaction.user.displayName}`,
    iconURL: interaction.user.displayAvatarURL()
  })

  try {
    await interaction.deferReply()
    const response = await fetch(`https://v2.jokeapi.dev/joke/${category}`)
    
    if(!response.ok) throw new Error(`non-200 response status code: **${response.status} — ${response.statusText}**`)

    const json = await response.json()
    
    if(json?.error) throw new Error(json?.additionalInfo)

    if(!json.safe){
      await notifyUser(json, interaction)
      jokeEmbed.setColor("DarkButNotBlack")
    }
    const jokeType = json.type

    if(jokeType === "twopart") await handleTwoPart(json, interaction, jokeEmbed)
    else if(jokeType === "single"){
      jokeEmbed.setTitle(`Category: ${json.category}`).setDescription(json.joke)
      interaction.editReply({ embeds: [jokeEmbed] })
    }
  } catch (error) {
    jokeEmbed
      .setTitle("Oops...")
      .setDescription(error)
      .setColor("White")
    return interaction.editReply({ embeds: [jokeEmbed], components: [] })
  }
}

module.exports = {
  name: "joke",
  description: "Sends a random joke",
  options: [
    {
      name: "category",
      description: "Joke category",
      type: ApplicationCommandOptionType.String
    }
  ],
  cooldown: 10000,
  callback: handleJoke
}
