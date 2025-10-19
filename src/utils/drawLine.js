/**
 * Created by caelondev
 * Licensed under the GNU AGPLv3
 * See LICENSE for details.
 */

module.exports = (count = 75, symbol = "—", output=false)=>{
  var word = `\n${symbol.repeat(count)}\n`

  if(output){
    return word
  }
  
  console.log(word)
}
