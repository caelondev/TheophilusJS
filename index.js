/**
 * Created by caelondev
 * Licensed under the GNU AGPLv3
 * See LICENSE for details.
 */

async function createBot(){
  await require("./src/init.js")()

  await require("./src/pinger.js")
}

createBot()
