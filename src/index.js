require("dotenv").config()
const { Client, IntentsBitField } = require("discord.js")
const eventHandler = require("./handlers/eventHandler")
const buildConfig = require("./utils/buildConfig")
const drawLine = require("./utils/drawLine")
const connectMongoDB = require("./utils/connectMongoDB")

const client = new Client({
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMembers,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.MessageContent
  ]
})

const loginBot = (TOKEN)=>{
  try{
    client.login(TOKEN)
  } catch(error) {
    console.log(error)
  }
}

const initialze = async()=>{
  console.clear()
  drawLine()
  buildConfig()
  await connectMongoDB(process.env.MONGODB_URI)
  eventHandler(client)
  loginBot(process.env.DISCORD_TOKEN)
}

initialze()
