import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { 
    addComment,
    deleteComment,
    getVideoComments,
    updateComment
} from "../controllers/comment.controller.js";

const router = Router()

router.route()

router.route("/getVideoComments/:videoId").get(verifyJWT, getVideoComments)
router.route("/addComment/:videoId").post(verifyJWT, addComment)
router.route("/updateComment/:commentId").patch(verifyJWT, updateComment)
router.route("/deleteComment/:commentId").delete(verifyJWT, deleteComment)

export default router