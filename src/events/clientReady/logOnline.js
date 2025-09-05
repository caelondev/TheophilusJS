const drawLine = require("../../utils/drawLine")

module.exports = (client)=>{
  drawLine()
  console.log(`🤖 ${client.user.tag} is online`)
}
