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
import videoRouter from "./routes/video.routes.js"
import likeRouter from "./routes/like.routes.js"
import commentRoute from "./routes/comment.routes.js"
import subscriptionRoute from "./routes/subscription.routes.js"
import playlistRoute from "./routes/playlist.routes.js"

//routes declaration
app.use("/api/v1/users", userRouter)
app.use("/api/v1/videos", videoRouter)
app.use("/api/v1/likes", likeRouter)
app.use("/api/v1/comments", commentRoute)
app.use("/api/v1/subscriptions", subscriptionRoute)
app.use("/api/v1/playlists", playlistRoute)

//it will pass the route to the userRouter and it wiill look like this http://localhost:8000/api/v1/users/register


export default app