/**
 * Created by caelondev
 * Licensed under the GNU AGPLv3
 * See LICENSE for details.
 */

const {
  Client,
  Interaction,
  MessageFlags,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  ApplicationCommandOptionType,
} = require("discord.js");
const User = require("../../models/User");

const choices = [
  { name: "Rock", emoji: "🪨", beats: "Scissors" },
  { name: "Paper", emoji: "📄", beats: "Rock" },
  { name: "Scissors", emoji: "✂️", beats: "Paper" },
];

// --- Helper: send initial game invite ---
async function sendInvite(interaction, challenger, opponent) {
  const inviteRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("accept")
      .setLabel("Accept")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId("reject")
      .setLabel("Reject")
      .setStyle(ButtonStyle.Danger)
  );

  const inviteMessage = await interaction.followUp({
    content: `${opponent}, ${challenger} invited you to a game of Rock, Paper, Scissors!`,
    components: [inviteRow],
  });

  const inviteResponse = await inviteMessage.awaitMessageComponent({
    filter: (i) => i.user.id === opponent.id,
    time: 60_000,
  }).catch(async () => {
    await inviteMessage.edit({
      content: `❌ ${opponent} did not respond in time. Invitation cancelled.`,
      components: [],
    });
    return null;
  });

  if (!inviteResponse) return null;

  if (inviteResponse.customId === "reject") {
    await inviteResponse.update({
      content: `❌ ${opponent} rejected the Rock, Paper, Scissors invitation.`,
      components: [],
    });
    return null;
  }

  await inviteResponse.update({
    content: `✅ ${opponent} accepted!`,
    components: [],
  });

  return true;
}

// --- Helper: handle bet confirmation ---
async function confirmBet(interaction, challenger, opponent, betAmount) {
  if (betAmount <= 0) return true; // no bet, just continue

  const betRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("accept-bet")
      .setLabel("Accept bet")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId("request-nonbet")
      .setLabel("Request non-bet game")
      .setStyle(ButtonStyle.Danger)
  );

  const betMessage = await interaction.followUp({
    content: `${opponent}, ${challenger} entered a bet of **${betAmount} coins**. Do you accept?`,
    components: [betRow],
  });

  const betResponse = await betMessage.awaitMessageComponent({
    filter: (i) => i.user.id === opponent.id,
    time: 60_000,
  }).catch(async () => {
    await betMessage.edit({
      content: `❌ ${opponent} did not respond to the bet confirmation. Game cancelled.`,
      components: [],
    });
    return null;
  });

  if (!betResponse) return null;

  if (betResponse.customId === "accept-bet") {
    await betResponse.update({
      content: `✅ ${opponent} accepted the bet! Starting the game...`,
      components: [],
    });
    return true;
  } else if (betResponse.customId === "request-nonbet") {
    await betResponse.update({
      content: `📩 ${opponent} requested a non-bet game. Waiting for ${challenger}'s decision...`,
      components: [],
    });

    // Challenger confirms non-bet
    const challengerRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("agree-nonbet")
        .setLabel("Agree")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId("reject-nonbet")
        .setLabel("Reject")
        .setStyle(ButtonStyle.Danger)
    );

    const challengerMessage = await interaction.followUp({
      content: `${challenger}, ${opponent} requested a betless game. Do you agree?`,
      components: [challengerRow],
    });

    const challengerResponse = await challengerMessage.awaitMessageComponent({
      filter: (i) => i.user.id === challenger.id,
      time: 60_000,
    }).catch(async () => {
      await challengerMessage.edit({
        content: `❌ ${challenger} did not respond. Game cancelled.`,
        components: [],
      });
      return null;
    });

    if (!challengerResponse) return null;

    if (challengerResponse.customId === "agree-nonbet") {
      await challengerResponse.update({
        content: `✅ ${challenger} agreed. Starting a non-bet game.`,
        components: [],
      });
      return 0; // indicate game should run with 0 bet
    } else {
      await challengerResponse.update({
        content: `❌ ${challenger} rejected the non-bet request. Game cancelled.`,
        components: [],
      });
      return null;
    }
  }
}

// --- Helper: create choice buttons ---
function createChoiceButtons() {
  return new ActionRowBuilder().addComponents(
    choices.map((c) =>
      new ButtonBuilder()
        .setCustomId(c.name)
        .setLabel(c.name)
        .setStyle(ButtonStyle.Primary)
        .setEmoji(c.emoji)
    )
  );
}

// --- Helper: wait for a player to pick ---
async function waitForChoice(message, player) {
  const interaction = await message.awaitMessageComponent({
    filter: (i) => i.user.id === player.id,
    time: 60_000,
  }).catch(() => null);

  return interaction;
}

// --- Helper: determine winner ---
function getWinner(player1Choice, player1, player2Choice, player2) {
  if (player1Choice.beats === player2Choice.name) return `${player1} won! 🏆`;
  if (player2Choice.beats === player1Choice.name) return `${player2} won! 🏆`;
  return "It's a tie! 🤝";
}

// --- Helper: bet handler ---
const getBetResult = (opponentChoice, opponent, challengerChoice, challenger, opponentData, challengerData, betAmount) => {
  if (betAmount <= 0) return "";

  let winner, loser, winnerData, loserData;

  if (challengerChoice.beats === opponentChoice.name) {
    winner = challenger.username;
    loser = opponent.username;
    winnerData = challengerData;
    loserData = opponentData;
    challengerData.balance += betAmount;
    opponentData.balance -= betAmount;
  } else if (opponentChoice.beats === challengerChoice.name) {
    winner = opponent.username;
    loser = challenger.username;
    winnerData = opponentData;
    loserData = challengerData;
    opponentData.balance += betAmount;
    challengerData.balance -= betAmount;
  } else {
    return ""; // tie, no bet changes
  }

  opponentData.save();
  challengerData.save();

  return `${winner} won **+${betAmount} coins!** Their balance is now **${winnerData.balance}**. ` +
         `${loser} lost **-${betAmount} coins**. Their balance is now **${loserData.balance}**.`;
};

// --- Main game logic ---
const handleRockPaperScissors = async (client, interaction) => {
  try {
    const challenger = interaction.user;
    const opponent = interaction.options.getUser("opponent");
    let betOpt = interaction.options.get("bet")?.value || 0;
    let betAmount = parseFloat(betOpt);

    if (!opponent || opponent.bot || opponent.id === challenger.id) {
      return interaction.reply({ content: `❌ Invalid opponent.`, ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: false });

    const opponentQuery = { guildId: interaction.guild.id, userId: opponent.id };
    const challengerQuery = { guildId: interaction.guild.id, userId: challenger.id };
    let opponentData = await User.findOne(opponentQuery) || new User(opponentQuery);
    let challengerData = await User.findOne(challengerQuery) || new User(challengerQuery);

    // Parse bet
    if (isNaN(betAmount)) {
      if (betOpt.toLowerCase() === "all") betAmount = challengerData.balance;
      else if (betOpt.toLowerCase() === "half") betAmount = challengerData.balance * 0.5;
      else betAmount = 0;
    }

    if (betAmount > challengerData.balance) return interaction.editReply(`❌ Your bet is too high. Current balance: **${challengerData.balance}**.`);
    if (betAmount > opponentData.balance) return interaction.editReply(`❌ Bet exceeds ${opponent}'s balance of **${opponentData.balance}**.`);
    if (betAmount <= 0) await interaction.editReply(`ℹ️ Playing a non-bet game.`);

    // Send initial invite
    const accepted = await sendInvite(interaction, challenger, opponent);
    if (!accepted) return;

    // Bet confirmation
    const finalBet = await confirmBet(interaction, challenger, opponent, betAmount);
    if (finalBet === null) return; // game cancelled
    if (finalBet === 0) betAmount = 0; // opponent requested non-bet and challenger agreed

    // Start game
    const embed = new EmbedBuilder()
      .setTitle("Rock, Paper, Scissors!")
      .setDescription(`It's currently ${opponent.username}'s turn.`)
      .setColor("Yellow")
      .setTimestamp();

    const choiceRow = createChoiceButtons();

    const gameMessage = await interaction.followUp({
      content: `${opponent}, it's your turn!`,
      embeds: [embed],
      components: [choiceRow],
    });

    // Opponent's turn
    const opponentInteraction = await waitForChoice(gameMessage, opponent);
    if (!opponentInteraction) {
      embed.setDescription(`❌ Game over! ${opponent} didn’t respond.`);
      return gameMessage.edit({ embeds: [embed], components: [] });
    }
    const opponentChoice = choices.find((c) => c.name === opponentInteraction.customId);
    await opponentInteraction.reply({ content: `You picked ${opponentChoice.name} ${opponentChoice.emoji}`, ephemeral: true });

    // Challenger's turn
    embed.setDescription(`It's currently ${challenger.username}'s turn!`);
    await gameMessage.edit({ content: `${challenger}, it's your turn!`, embeds: [embed] });

    const challengerInteraction = await waitForChoice(gameMessage, challenger);
    if (!challengerInteraction) {
      embed.setDescription(`❌ Game over! ${challenger} didn’t respond.`);
      return gameMessage.edit({ embeds: [embed], components: [] });
    }
    const challengerChoice = choices.find((c) => c.name === challengerInteraction.customId);
    await challengerInteraction.reply({ content: `You picked ${challengerChoice.name} ${challengerChoice.emoji}`, ephemeral: true });

    // Announce winner
    const result = getWinner(opponentChoice, opponent, challengerChoice, challenger);
    const betResult = getBetResult(opponentChoice, opponent, challengerChoice, challenger, opponentData, challengerData, betAmount);

    embed.setDescription(
      `${opponent} picked ${opponentChoice.name} ${opponentChoice.emoji}\n` +
      `${challenger} picked ${challengerChoice.name} ${challengerChoice.emoji}\n\n` +
      result + "\n" + betResult
    );

    await gameMessage.edit({ embeds: [embed], components: [] });

  } catch (error) {
    console.error(error);
    if (interaction.deferred || interaction.replied) {
      interaction.followUp({ content: `❌ Something went wrong!`, ephemeral: true });
    } else {
      interaction.reply({ content: `❌ Something went wrong!`, ephemeral: true });
    }
  }
};

module.exports = {
  name: "rps",
  description: "Challenge someone to Rock, Paper, Scissors!",
  options: [
    {
      name: "opponent",
      description: "The user you want to challenge",
      type: ApplicationCommandOptionType.User,
      required: true,
    },
    {
      name: "bet",
      description: "The bet you want to set (Number, 'Half', 'All')",
      type: ApplicationCommandOptionType.String,
      required: false,
    },
  ],
  cooldown: 10_000,
  serverSpecific: true,
  callback: handleRockPaperScissors,
};
