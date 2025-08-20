import mongoose, {isValidObjectId} from "mongoose"
import {Video} from "../models/video.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"

const publishVideo = asyncHandler(async (req, res) => {
    const { title, description } = req.body

    if ([title, description].some((field) => field.trim() === "")) {
        throw new ApiError(400, "Title and Discription field id required")
    }

    let thumbnailLocalPath;
    if(req.files && Array.isArray(req.files.thumbnail) && req.files.thumbnail.length > 0) {
        thumbnailLocalPath = req.files.thumbnail[0].path
        console.log(req.files)
    }

    let videoFileLocalPath;
    if (req.files && Array.isArray(req.files.videoFile) && req.files.videoFile.length > 0) {
        videoFileLocalPath = req.files.videoFile[0].path
    }

    if (!thumbnailLocalPath) {
        throw new ApiError(400, "thumbnail id required")
    }

    if (!videoFileLocalPath) {
        throw new ApiError(400, "video file is required")
    }

    const thumbnail = new uploadOnCloudinary(thumbnailLocalPath)
    const videoFile = new uploadOnCloudinary(videoFileLocalPath)

    
})

export {
    publishVideo
}