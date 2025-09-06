module.exports = (count = 75, symbol = "—", output=false)=>{
  var word = `\n${symbol.repeat(count)}\n`

  if(output){
    return word
  }
  
  console.log(word)
}
