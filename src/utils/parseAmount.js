/**
 * Created by caelondev
 * Licensed under the GNU AGPLv3
 * See LICENSE for details.
 */

module.exports = (amount, userBalance) => {
  // Try parsing a number directly
  let parsedAmount = parseFloat(amount);

  if (!isNaN(parsedAmount)) {
    return parsedAmount;
  }

  // Normalize text input
  if (typeof amount === "string") {
    amount = amount.toLowerCase().trim();
  }

  switch (amount) {
    case "all":
      return userBalance;

    case "half":
      return userBalance * 0.5;

    case "quarter":
      return userBalance * 0.25;

    case "third": {
      // Equivalent to dividing by 3 but uses multiplication by reciprocal
      const reciprocal = 0.3333333333; // approximate 1/3
      return userBalance * reciprocal;
    }

    case "max":
      // alias for all
      return userBalance;

    default:
      return 0; // invalid input
  }
};
