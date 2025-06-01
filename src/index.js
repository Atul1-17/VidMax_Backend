// import mongoose from "mongoose";
// import { DB_NAME } from "./constants";

import dotenv from "dotenv"
import connectDB from "./db/index.js";

dotenv.config({
    path: ".env"
})

connectDB()

// First approach to connect the data base

// import express from "express"

// const app = express()

// (async ()=> {
//  try { 
//     await mongoose.connect(`${process.env.MONGODB_URL}/${DB_NAME}`)
//     app.on("error", (error)=> {
//         console.log("Error", error);
//         throw error;
//     })
//     app.listen(process.env.PORT, ()=> {
//         console.log(`App is listening on the port ${process.env.PORT}`)
//     })
//  } catch (error) {
//     console.error("Error :", error)
//     throw error;
//  }
// })()