const { Client, Interaction, EmbedBuilder } = require("discord.js");
const si = require("systeminformation")
const cfl = require("../../utils/capitalizeFirstLetter")
const getConfig = require("../../utils/getConfig")
const config = getConfig()

const formatInfoData = (infoDatas)=>{
  if(!infoDatas || infoDatas.length === 0) return "No data found."

  let formattedData = ""

  for(const data of infoDatas){
    formattedData += `╭=================╮\n╰> **${data.category}**\n\n`

    for(const [k, v] of Object.entries(data)){
      if(k === "category") continue
      let key = k || "Unknown"
      const value = v || "Unknown"
      
      key = key.split("_").join(" ")
      formattedData += `**${cfl(key)}**: **${value}**\n`
    }
  }

  return formattedData
}

const getHardwareInfo = async () => {
  const infos = [];

  try {
    const cpu = await si.cpu();
    const mem = await si.mem();
    const osInfo = await si.osInfo();
    const disk = await si.diskLayout();

    infos.push({
      category: 'CPU',
      model: cpu.brand,
      cores: cpu.cores,
      physical_cores: cpu.physicalCores,
      speed: `${cpu.speed}GHz`
    });

    infos.push({
      category: 'Memory',
      total: `${(mem.total / 1024 / 1024 / 1024).toFixed(2)}GB`,
      free: `${(mem.free / 1024 / 1024 / 1024).toFixed(2)}GB`
    });

    infos.push({
      category: 'OS',
      platform: osInfo.platform,
      distro: osInfo.distro,
      release: osInfo.release,
      arch: osInfo.arch
    });

    if (disk.length > 0) {
      infos.push({
        category: 'Disk',
        name: disk[0].name,
        type: disk[0].type,
        size: `${(disk[0].size / 1024 / 1024 / 1024).toFixed(2)}GB`
      });
    }

    return infos;
  } catch (error) {
    console.error(error);
    return [];
  }
};
/**
 * @param {Client} client
 * @param {Interaction} interaction
 */

const handleBotInfo = async (client, interaction) => {
  let infoEmbed = new EmbedBuilder()
      .setTitle(`${client.user.displayName.toUpperCase()}'s Info.`)
      .setFooter({ text: "Data fetching failed" })
  try {
    await interaction.deferReply()

    const hardwareInfo = await getHardwareInfo()
    const formattedInfoData = formatInfoData(hardwareInfo)

    const owner = await client.users.fetch(config.ownerId)

    infoEmbed
      .setDescription(formattedInfoData)
      .setColor(`Blurple`)
      .setFooter({ text: `${client.user.displayName} by ${owner.displayName}.`, iconURL: owner.avatarURL() || undefined })

    await interaction.editReply({ embeds: [infoEmbed] })
  } catch (error) {
    infoEmbed.setDescription("An error occurred whilst fetching bot information.").setColor("Red")
    await interaction.editReply({ embeds: [infoEmbed] })
    console.error(error)
  }
};

module.exports = {
  name: "bot-info",
  description: "Check bot's information.",
  cooldown: 5000,
  callback: handleBotInfo,
};
