import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"

const app = express()

//we use cors to avoid the cors error
app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))


//we are accepting the json data and setting the maximum size 
app.use(express.json({limit: "16kb"}))
app.use(express.urlencoded({extended: true, limit: "16kb"}))

//it store public assets  (like image) it will store in public folder
app.use(express.static("public"))
app.use(cookieParser())

//routes import
import userRouter from "./routes/user.routes.js"

//routes declaration
app.use("/api/v1/users", userRouter)

//it will pass the route to the userRouter and it wiill look like this http://localhost:8000/api/v1/users/register


export default app