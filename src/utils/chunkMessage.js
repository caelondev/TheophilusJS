/**
 * Created by caelondev
 * Licensed under the GNU AGPLv3
 * See LICENSE for details.
 */

module.exports = (message, size = 2000, trail) => {
  const chunks = []
  let start = 0

  while(start < message.length){
    let end = start + size

    if(trail && end < message.length) end -= trail.length

    chunks.push(message.slice(start, end) + (end < message.length ? trail : ""))
    start = end
  }

  return chunks
}
