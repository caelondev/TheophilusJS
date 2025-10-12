module.exports = (options, name) => {
  if (!Array.isArray(options)) throw new TypeError("options must be an array");
  for(const option of options) {
    if(option.name === name) return option.value
  }
};
