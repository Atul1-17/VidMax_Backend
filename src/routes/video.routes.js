import { Router } from "express";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
    publishVideo,
    deleteVideo,
    updateVideo,
    getVideoById,
    togglePublishStatus
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
router.route("/c/:updateId").patch(verifyJWT, upload.single("thumbnail"), updateVideo)
router.route("/c/:getVideoId").get(verifyJWT, getVideoById)
router.route("/t/:toggleVideoId").patch(verifyJWT, togglePublishStatus)

export default router