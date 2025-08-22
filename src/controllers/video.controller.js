import {Video} from "../models/video.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import uploadOnCloudinary from "../utils/cloudinary.js"


const publishVideo = asyncHandler(async (req, res) => {
    const { title, description } = req.body
    const isPublicInput = req.body.isPublic

    if ([title, description].some((field) => typeof field !== "string" || field.trim() === "")) {
        throw new ApiError(400, "Title and description are required")
    }

    let thumbnailLocalPath;
    if (req.files && Array.isArray(req.files.thumbnail) && req.files.thumbnail.length > 0) {
        thumbnailLocalPath = req.files.thumbnail[0].path
    }

    let videoFileLocalPath;
    if (req.files && Array.isArray(req.files.videoFile) && req.files.videoFile.length > 0) {
        videoFileLocalPath = req.files.videoFile[0].path
    }

    if (!thumbnailLocalPath) {
        throw new ApiError(400, "Thumbnail is required")
    }

    if (!videoFileLocalPath) {
        throw new ApiError(400, "Video file is required")
    }

    // Upload both files in parallel
    const [thumbnailUpload, videoUpload] = await Promise.all([
        uploadOnCloudinary(thumbnailLocalPath),
        uploadOnCloudinary(videoFileLocalPath)
    ])

    if (!thumbnailUpload?.url) {
        throw new ApiError(400, "Thumbnail upload failed")
    }

    if (!videoUpload?.url) {
        throw new ApiError(400, "Video upload failed")
    }

    const ownerId = req.user?._id
    if (!ownerId) {
        throw new ApiError(401, "Unauthorized")
    }

    // Coerce isPublic properly; default true if not provided
    const isPublic = typeof isPublicInput === "string"
        ? isPublicInput === "true"
        : (typeof isPublicInput === "boolean" ? isPublicInput : true)

    const newVideo = await Video.create({
        title: title.trim(),
        description: description.trim(),
        videoFile: videoUpload.url,
        thumbnail: thumbnailUpload.url,
        duration: (videoUpload.duration != null ? String(videoUpload.duration) : "0"),
        isPublic,
        owner: ownerId,
    })

    if (!newVideo) {
        throw new ApiError(500, "Video creation failed")
    }

    const videoWithDetails = await Video.findById(newVideo._id)
        .populate("owner", "username avatar email")

    return res
        .status(201)
        .json(new ApiResponse(201, videoWithDetails, "Video published successfully"))
});


export {
    publishVideo
}