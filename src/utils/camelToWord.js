/**
 * Created by caelondev
 * Licensed under the GNU AGPLv3
 * See LICENSE for details.
 */

module.exports = (str)=>{
  if (typeof str !== 'string' || str.length === 0) return '';

  let result = str.replace(/([A-Z])/g, ' $1');

  result = result.toLowerCase();
  return result[0].toUpperCase() + result.slice(1);
}
