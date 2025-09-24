async function createBot(){
  await require("./src/init.js")()

  await require("./src/pinger.js")
}

createBot()
