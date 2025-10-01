const { Client, Interaction, ApplicationCommandOptionType, EmbedBuilder } = require("discord.js");
const getRandom = require("../../utils/getRandom");


/**
 * @param {Client} client
 * @param {Interaction} interaction
 * */
const handle8Ball = async(client, interaction) => {
  const question = interaction.options.getString("question")
  const ballEmbed = new EmbedBuilder().setColor("Blurple").setTimestamp()
  try {
    await interaction.deferReply()
    const responses = [
      "It is certain.",
      "It is decidedly so.",
      "Without a doubt.",
      "Yes – definitely.",
      "You may rely on it.",
      "As I see it, yes.",
      "Most likely.",
      "Outlook good.",
      "Yes.",
      "Signs point to yes.",
      "Reply hazy, try again.",
      "Ask again later.",
      "Better not tell you now.",
      "Cannot predict now.",
      "Concentrate and ask again.",
      "Don't count on it.",
      "My reply is no.",
      "My sources say no.",
      "Outlook not so good.",
      "Very doubtful."
    ];

    ballEmbed.setTitle(`"${question}"`).setDescription(getRandom(responses))
    interaction.editReply({ embeds: [ballEmbed] })
  } catch (error) {
    console.error(error)
    ballEmbed.setDescription("An error occurred")
    interaction.editReply({ embeds: [ballEmbed] })
  }
}

module.exports = {
  name: "8-ball",
  description: "Shake the ball and reveal your fate",
  options: [
    {
      name: "question",
      description: "The question you want to ask to the ball",
      type: ApplicationCommandOptionType.String,
      required: true
    }
  ],
  callback: handle8Ball
}
