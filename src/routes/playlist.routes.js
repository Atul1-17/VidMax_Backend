import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist
} from "../controllers/playlist.controller.js"

const router = Router()

router.route("/createPlaylist").post(verifyJWT, createPlaylist)
router.route("/getUserPlaylists/:userId").get(verifyJWT, getUserPlaylists)
router.route("/getPlaylistById/:playlistId").get(verifyJWT, getPlaylistById)
router.route("/addVideoToPlaylist/playlist/:playlistId/video/:videoId").patch(verifyJWT, addVideoToPlaylist)
router.route("/removeVideoFromPlaylist/playlist/:playlistId/video/:videoId").patch(verifyJWT, removeVideoFromPlaylist)
router.route("/deletePlaylist/:playlistId").delete(verifyJWT, deletePlaylist)
router.route("/updatePlaylist/:playlistId").patch(verifyJWT, updatePlaylist)

export default router