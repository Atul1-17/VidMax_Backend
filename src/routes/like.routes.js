import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
    getLikedVideos,
    toggleCommentLike,
    toggleVideoLike
} from "../controllers/like.controller.js";

const router = Router()

router.route("/toggle/:videoId").post(verifyJWT, toggleVideoLike)
router.route("/toggleComment/:commentId").post(verifyJWT, toggleCommentLike)
router.route("/getLikedVideos").get(verifyJWT, getLikedVideos)


export default router