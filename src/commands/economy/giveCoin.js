const { Client, Interaction, ApplicationCommandOptionType, MessageFlags } = require("discord.js");
const User = require("../../models/User");

/**
 * @param {Client} client
 * @param {Interaction} interaction
 */
const handleGiveCoins = async (client, interaction) => {
  const userOpt = interaction.options.get("user");
  const amountOpt = interaction.options.get("amount").value;

  let amount = parseFloat(amountOpt);

  const queryOne = {
    guildId: interaction.guild.id,
    userId: userOpt.user.id
  };

  const queryTwo = {
    guildId: interaction.guildId,
    userId: interaction.user.id
  };

  if(userOpt.user.id === interaction.user.id){
    return interaction.reply({
      content: "❌ You can’t give coins to yourself.",
      flags: MessageFlags.Ephemeral
    })
  }

  try {
    await interaction.deferReply();

    let userToGive = await User.findOne(queryOne);
    const userToDeduct = await User.findOne(queryTwo);

    if (isNaN(amount)) {
      if (amountOpt.toLowerCase() === "all") {
        amount = userToDeduct.balance;
      } else if (amountOpt.toLowerCase() === "half") {
        amount = userToDeduct.balance * 0.5;
      } else {
        return interaction.editReply(`❌ Invalid amount of coins!`);
      }
    }

    // Initialize user if not found
    if (!userToGive) {
      userToGive = new User({
        ...queryOne,
        balance: 0
      });
    }

    if (!userToDeduct || userToDeduct.balance < amount) {
      return interaction.editReply(`❌ Cannot give **${amount} coins** – insufficient balance!`);
    }

    // Start transaction
    const session = await User.startSession();
    session.startTransaction();
    try {
      userToDeduct.balance -= amount;
      userToGive.balance += amount;

      await userToDeduct.save({ session });
      await userToGive.save({ session });

      await session.commitTransaction();
    } catch (e) {
      await session.abortTransaction();
      throw e;
    } finally {
      session.endSession();
    }

    return interaction.editReply(`✅ Successfully gave **+${amount} coins** to **<@${userOpt.user.id}>**! Their new balance is now: **${userToGive.balance} coins** whilst your new balance is now: **${userToDeduct.balance} coins**`);
  } catch (error) {
    console.log(error);
    return interaction.editReply("❌ An error occurred while processing the transaction.");
  }
};

module.exports = {
  name: "give-coin",
  description: "Give money to someone",
  options: [
    {
      name: "user",
      description: "The user you want to give your money",
      type: ApplicationCommandOptionType.User,
      required: true
    },
    {
      name: "amount",
      description: "The amount of money you want to give to the user (All, Half, 1, 30, 50...)",
      type: ApplicationCommandOptionType.String,
      required: true
    }
  ],
  cooldown: 5000,
  callback: handleGiveCoins
};
