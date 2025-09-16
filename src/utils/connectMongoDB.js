const mongoose = require("mongoose")

module.exports = async(mongodb_uri)=>{
  try{
    console.log("⏳ Connecting to MongoDB...")
    mongoose.set("strictQuery", false)
    await mongoose.connect(mongodb_uri)
    console.log("✅ Successfully connected to MongoDB!")
  } catch(error){
    console.log(`❌ An error occurred while connecting to MongoDB! ${error}`)
  }
}
