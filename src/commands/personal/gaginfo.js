const {  
  Client,  
  Interaction,  
  ApplicationCommandOptionType,  
  InteractionContextType,  
  EmbedBuilder,  
} = require("discord.js");  
  
const API_URL = "https://gagstock.gleeze.com/grow-a-garden";  
  
const getFormattedData = (data, itemName) => {  
  let formattedData = "";  
  
  if (!data || !data.items || !Array.isArray(data.items)) return "No items found, try again later...";  
    
  let itemsToShow = data.items;  
  if (itemName) {  
    formattedData += `\n\`Showing results for "${itemName}"...\`\n\n`  
    itemsToShow = data.items.filter(item =>   
      item.name.toLowerCase().includes(itemName.toLowerCase())  
    );  
      
    if (itemsToShow.length === 0) return `\`No items found matching "${itemName}"... Maybe out of stock?\``;  
  }  
  
  for (const item of itemsToShow) {  
    const emoji = item.emoji || "📦";  
    const name = item.name || "Unknown Item";  
    const quantity = item.quantity !== undefined ? item.quantity : "N/A";  
      
    formattedData += `${emoji} **${name}** — Stocks: **${quantity}**\n`;  
  }  
  
  if(Object.hasOwn(data, "status")){  
    formattedData += `\nCurrent status: **${data.status}**\n`  
  }  
  
  if(Object.hasOwn(data ,"appearIn")){  
    const nextAppearance = data.appearIn ?? "now"  
    formattedData += `Next appearance: **${nextAppearance}**\n`  
  }  
  else formattedData += `\nNext restock: **${data.countdown}**\n`  
  
  return formattedData || "No items found, try again later...";  
};  
  
/**  
 * @param {Client} client  
 * @param {Interaction} interaction  
 */  
const handleGagInfo = async (client, interaction) => {  
  const stockType = interaction.options.get("stock").value;  
  const itemName = interaction.options.get("item-name")?.value;  
    
  await interaction.deferReply()  
  
  try {  
    const res = await fetch(API_URL);  
      
    if (!res.ok) {  
      console.error(`API returned status: ${res.status}`);  
      throw new Error(`API request failed with status: ${res.status}`);  
    }  
  
    const json = await res.json();  
      
    if (!json || !json.data) {  
      throw new Error("Invalid API response structure");  
    }  
      
    const data = json.data[stockType];  
    let formattedData = ""  
  
    if (!data) {  
      formattedData = `No data found for \`${stockType}\`.`;  
    }  
  
    formattedData = getFormattedData(data, itemName);  
  
    const description = formattedData.length > 4096   
      ? formattedData.substring(0, 4093) + "..."   
      : formattedData;  
      
    const formattedEmbed = new EmbedBuilder()  
      .setTitle(`GROW-A-GARDEN ${stockType.toUpperCase()} INFO`)  
      .setDescription(description)  
      .setFooter({   
        text: `Requested by: ${interaction.user.displayName}`,   
        iconURL: interaction.user.displayAvatarURL()   
      })  
      .setTimestamp()  
      .setColor(0x00FF00);  
  
    await interaction.editReply({ embeds: [formattedEmbed] });  
      
  } catch (error) {  
    console.error("Error in handleGagInfo:", error);  
    try {  
      if (interaction.deferred) {  
        await interaction.editReply("An error occurred whilst fetching stocks. Please try again later.");  
      } else {  
        await interaction.reply("An error occurred whilst fetching stocks. Please try again later.");  
      }  
    } catch (replyError) {  
      console.error("Failed to send error message:", replyError);  
    }  
  }  
};  
  
module.exports = {  
  name: "gag-info",  
  description: "Check grow-a-garden stock info.",  
  options: [  
    {  
      name: "stock",  
      description: "The stock you want to check",  
      type: ApplicationCommandOptionType.String,  
      required: true,  
      choices: [  
        {  
          name: "Seed",  
          value: "seed",  
        },  
        {  
          name: "Gear",  
          value: "gear",  
        },  
        {  
          name: "Egg",  
          value: "egg",  
        },  
        {  
          name: "Cosmetics",  
          value: "cosmetics",  
        },  
        {  
          name: "Honey",  
          value: "honey",  
        },  
        {  
          name: "Traveling-Merchant",  
          value: "travelingmerchant",  
        },  
      ],  
    },  
    {  
      name: "item-name",  
      description: "The item stock that you want to see",  
      type: ApplicationCommandOptionType.String,  
    },  
  ],  
  cooldown: 5000,  
  callback: handleGagInfo,  
}
