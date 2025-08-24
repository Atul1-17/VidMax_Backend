import { Router } from "express";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
    publishVideo,
    deleteVideo
} from "../controllers/video.controller.js"

const router = Router()

router.route("/publishVideo").post(
    upload.fields([
        {
            name: "thumbnail",
            maxCount: 1
        },
        {
            name: "videoFile",
            maxCount: 1
        }
    ]),
    verifyJWT,
    publishVideo)

router.route("/c/:videoId").delete(verifyJWT, deleteVideo)

export default router