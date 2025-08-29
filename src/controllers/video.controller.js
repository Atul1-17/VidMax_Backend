import {Video} from "../models/video.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {uploadOnCloudinary, deleteFromCloudinary} from "../utils/cloudinary.js"


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
        videoPublicId: videoUpload.public_id,
        thumbnailPublicId: thumbnailUpload.public_id,
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

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    
    const video = await Video.findById(videoId)

    if (!video) {
        throw new ApiError(404, "Video not found")
    }

    if (!video.owner.equals(req.user?._id)) {
        throw new ApiError(403, "Forbidden: You do not own this video")
    }

    await deleteFromCloudinary(video.videoPublicId, "video")
    await deleteFromCloudinary(video.thumbnailPublicId, "image")
    await Video.findByIdAndDelete(videoId)

    return res
    .status(200)
    .json(new ApiResponse(
        200,
        "The video deleted successfully"
    ))
    

});

const updateVideo = asyncHandler(async (req, res) => {
    const { updateId } = req.params
    const {title, description} = req.body

    //TODO: update video details like title, description, thumbnail

    // if ([title, description].some((field) => typeof field !== "string" || field.trim() === "")) {
    //     throw new ApiError(400, "Title and description are required")
    // }
    const video = await Video.findById(updateId)

    if (!video) {
        throw new ApiError(404, "Video not found")
    }

    if (req.user._id.toString() !== video.owner.toString()) {
        throw new ApiError(403, "You do not have permission to update this video")
    }

    let updatedFields = {}
    if (title && title.trim() !== "") {
        updatedFields.title = title;
    }

    if (description && description !== "") {
        updatedFields.description = description;
    }

    const thumbnailPublicId = video.thumbnailPublicId

    let thumbnailLocalPath = req.file?.path

    let newThumbnail;
    if (thumbnailLocalPath) {
        newThumbnail = await uploadOnCloudinary(thumbnailLocalPath)
        updatedFields.thumbnail = newThumbnail.url
        updatedFields.thumbnailPublicId = newThumbnail.public_id
    }

    if (Object.keys(updatedFields).length === 0) {
        throw new ApiError(400, "No valid fields provided for update");
    }

    const newVideo = await Video.findByIdAndUpdate(updateId,
        {   
            // update perticular document and if document is not there then create that document
            $set: updatedFields
        },
        {
            new: true
        }
    )

    if (thumbnailLocalPath && newThumbnail) {
        await deleteFromCloudinary(thumbnailPublicId, "image")
    }

    return res
    .status(200)
    .json(new ApiResponse(
        200,
        newVideo,
        "Successfully updated the video details"
    ))
});

const getVideoById = asyncHandler(async (req, res) => {
    const { getVideoId } = req.params
    
    const video = await Video.findById(getVideoId)

    if (!getVideoId) {
        throw new ApiError(404, "Video not found")
    }

    return res
    .status(200)
    .json(new ApiResponse(
        200,
        video,
        "Video fetched successfully"
    ))
});

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { toggleVideoId } = req.params

    const video = await Video.findById(toggleVideoId)

    if (!video) {
        throw new ApiError(404, "Video not found")
    }

    if (req.user?._id.toString() !== video.owner.toString()) {
        throw new ApiError(403, "Forbidden: You do not have permission to change the status of this video.")
    }

    const newVideo = await Video.findByIdAndUpdate(toggleVideoId,
        {
            $set:{
                isPublic: !video.isPublic
            }
        },
        {
            new: true
        }
    )

    return res
    .status(200)
    .json(new ApiResponse(
        200,
        newVideo,
        `Video publish status changed successfully`
    ))

});

const getAllVideos = asyncHandler(async (req, res) => {
    // Your existing code to get query parameters
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;

    // --- Build the base query (match stage) ---
    const matchStage = {};

    // 1. Filter by user if userId is provided
    if (userId) {
        matchStage.owner = new mongoose.Types.ObjectId(userId);
    }

    // 2. Filter by text query if provided
    // Note: You must have a text index in your Video model for this to work
    // Example in schema: videoSchema.index({ title: "text", description: "text" });
    if (query) {
        matchStage.$text = { $search: query };
    }
    
    // 3. Ensure only published videos are returned to the public
    matchStage.isPublic = true;


    // --- Build the aggregation pipeline ---
    const videoAggregation = Video.aggregate([
        {
            $match: matchStage
        }
    ]);

    // --- Sorting ---
    const sortStage = {};
    if (sortBy && sortType) {
        sortStage[sortBy] = sortType === 'asc' ? 1 : -1;
        videoAggregation.sort(sortStage);
    } else {
        // Default sort by creation date
        videoAggregation.sort({ createdAt: -1 });
    }

    // --- Pagination using the plugin ---
    const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10)
    };

    const videos = await Video.aggregatePaginate(videoAggregation, options);

    if (videos.docs.length === 0) {
        return res.status(200).json(new ApiResponse(200, [], "No videos found."));
    }

    return res
        .status(200)
        .json(new ApiResponse(200, videos, "Videos fetched successfully"));
});


export {
    publishVideo,
    deleteVideo,
    updateVideo,
    getVideoById,
    togglePublishStatus,
    getAllVideos
}