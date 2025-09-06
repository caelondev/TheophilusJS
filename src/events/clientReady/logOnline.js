const drawLine = require("../../utils/drawLine")

module.exports = async(client)=>{
  drawLine()
  console.log(`🤖 ${client.user.tag} is online!`)
  const websocketPing = await setTimeout(()=>{return client.ws.ping}, 300)
  console.log(`📶 Websocket ping: ${websocketPing}ms`)
}
