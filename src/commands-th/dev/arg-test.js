const args = [{name: "arg1", required: true}]

const handleArgTest = async (client, message) => {
  try {
    let listedArg = ""
    for(const arg of args){
      listedArg += `${arg?.name}: ${arg?.value}\n`
    }
    message.reply(`Received:\n${listedArg}`)
  } catch (error) {
    console.error("Arg test command error:", error)
  }
}

module.exports = {
  name: "arg-test",
  description: "Argument tester command",
  options: args,
  multiOpt: true,
  callback: handleArgTest
}
