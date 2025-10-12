module.exports = async(userStr, client) => {
  if(!userStr.startsWith("<@") || !userStr.endsWith(">")) throw new Error("Fetch user error, not a valid user")

  const userId = userStr.slice(2, -1)

  const userObj = await client.users.fetch(userId)
  return userObj
}
