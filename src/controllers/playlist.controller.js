import mongoose, {isValidObjectId} from "mongoose"
import { Video } from "../models/video.model"
import { Playlist } from "../models/playlist.model"
import { ApiError } from "../utils/ApiError"
import { ApiResponse } from "../utils/ApiResponse"
import { asyncHandler } from "../utils/asyncHandler"

const createPlaylist = asyncHandler(async (req, res) => {
    const {name, description} = req.body

    if ([name, description].some((field) => field?.trim() === "")) {
        throw new ApiError(400, "Title and Description field is required")
    }

    if (!req.user?._id) {
        throw new ApiError(401, "Unauthorized request ")
    }

    const playlist = Playlist.create({
        name,
        description,
        owner: req.user._id
    })

    if (!playlist) {
        throw new ApiError(500, "Something went wrong while creating the playlist")
    }

    return res
    .status(200)
    .json(new ApiResponse(
        200,
        playlist,
        "Playlist created successfully"
    ))
})

const getUserPlaylists = asyncHandler(async (req, res) => {
    const {userId} = req.params
    
    if (!isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid User ID format")
    }

    const playlists = await Playlist.find({owner: userId}) // there aere multiple playlist stored in the database it find the one with owner containing this userId.

    return res
    .status(200)
    .json(new ApiResponse(
        200, 
        playlists, 
        "User playlists fetched successfully"
    ))
})

const getPlaylistById = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    
    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid Playlist ID format")
    }

    const playlist = await Playlist.findById(playlistId)

    if (!playlist) {
        throw new ApiError(404, "Playlist not found")
    }

    return res
    .status(200)
    .json(new ApiResponse(
        200,
        playlist,
        "Playlist fetched successfully"
    ))
})

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params

    if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid Playlist or Video ID format")
    }

    const playlist = await Playlist.findById(playlistId)

    if (!playlist) {
        throw new ApiError(404, "Playlist not found")
    }

    if (playlist.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You do not have permission to modify this playlist");
    }

    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    const updatedPlaylist = await Playlist.findByIdAndUpdate(playlistId, 
        {
            $addToSet: {
                videos: videoId
            },
            $unset
        },
        {
            new: true
        }
    ) 

    return res
    .status(200)
    .json(new ApiResponse(
        200,
        updatedPlaylist,
        "Video Added in playlist successfully"
    ))
})

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params

    if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid Playlist or Video ID format")
    }

    const playlist = await Playlist.findById(playlistId)

    if (!playlist) {
        throw new ApiError(404, "Playlist not found")
    }

    if (playlist.owner.toString() !== req.user._id) {
        throw new ApiError(403, "You do not have permission to modify this playlist")
    }

    const updatedPlaylists = await Playlist.findByIdAndDelete(playlistId,
        {
            $pull: {
                videos: videoId
            }
        },
        {
            new: true
        }
    )

    if (!updatedPlaylists) {
        throw new ApiError(500, "Failed to remove video from the playlist")
    }

    return res
    .status(200)
    .json(new ApiResponse(
        200,
        updatedPlaylists,
        "Video removed from playlist successfully"
    ))

})

const deletePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    
    if (!isValidObjectId(playlistId)) {
    throw new ApiError(400, "Inavalid playlistId")
    }

    const playlist = await Playlist.findById(playlistId)

    if (!playlist) {
        throw new ApiError(404, "Playlist not found")
    }

    if (playlist.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You do not have permission to modify this playlist")
    }

    await Playlist.findByIdAndDelete(playlistId)

    return res
    .status(200)
    .json(new ApiResponse(
        200,
        {},
        "Playlist Deleted Successfully"
    ))
})

const updatePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    const {name, description} = req.body

    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid PlaylistID Format")
    }

    const playlist = await Playlist.findById(playlistId)

    if (!playlist) {
        throw new ApiError(404, "Playlist not found")
    }

    if (playlist.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You do not have permission to modify this playlist")
    }

    let updatedFields = {}

    if (name && name.trim() !== "") {
        updatedFields.name = name
    }

    if (description && description.trim() !== "") {
        updatedFields.description = description
    }

    if (Object.keys(updatedFields).length === 0) {
        throw new ApiError(400, "No valid fields provided for update");
    }

    const updatedPlaylist = await Playlist.findByIdAndUpdate(playlistId,
        {
            $set: updatedFields
        },
        {
            new: true
        }
    )

    return res
    .status(200)
    .json(new ApiResponse(
        200,
        updatedPlaylist,
        "The playlist updated successfully"
    ))


})


export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
}