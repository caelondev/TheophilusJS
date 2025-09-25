module.exports = (str)=>{
  if (typeof str !== 'string' || str.length === 0) return '';

  // Insert space before uppercase letters
  let result = str.replace(/([A-Z])/g, ' $1');

  // Lowercase everything and capitalize the first letter
  result = result.toLowerCase();
  return result[0].toUpperCase() + result.slice(1);
}
