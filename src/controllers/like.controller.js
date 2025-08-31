import { isValidObjectId } from "mongoose";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleVideoLike = asyncHandler(async (req, res) => {
    const {videoId} = req.params
    
    const userId = req.user._id

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID")
    }

    const existedLike = await Like.findOne({
        video: videoId,
        likedBy: userId
    })

    if (existedLike) {
        await Like.findByIdAndDelete(existedLike._id)

        return res
        .status(200)
        .json(new ApiResponse(
            200,
            {liked: false},
            "Like removed successfully"
        ))
    } else {
        await Like.create({
            video: videoId,
            likedBy: userId
        })

        return res
        .status(200)
        .json(new ApiResponse(
            201,
            {liked: true},
            "Video liked successfully"
        ))
    }
})

const toggleCommentLike = asyncHandler(async (req, res) => {
    const {commentId} = req.params
    
    const userId = req.user._id

    if (!isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid Comment Id")
    }

    const existedComment = await Like.findOne({
        comment: commentId,
        likedBy: userId
    })

    if (existedComment) {
        await Like.findByIdAndDelete(existedComment._id)

        return res
        .status(200)
        .json(new ApiResponse(
            200,
            {liked: false},
            "Liked removed successfully"
        ))
    } else {
        await Like.create({
            comment: commentId,
            likedBy: userId
        })

        return res
        .status(201)
        .json(new ApiResponse(
            201,
            "Comment liked successfully"
        ))
    }

})

const getLikedVideos = asyncHandler(async (req, res) => {
    const userId = req.user_id
    
    // Find all 'Like' documents for the current user where the 'video' field exists.
    // Then, populate the 'video' field to get the full video details.
    const likes = await Like.find({
        likedBy: userId,
        video: {$exsists: true, $ne: null}
    }).populate("Video")

    if (!likes || likes.length === 0) {
        return res
        .status(200)
        .json(new ApiResponse(
            200,
            [],
            "User has not liked any videos yet"
        ))
    }

    // The result from the query is an array of 'Like' documents.
    // We need to extract just the 'video' object from each 'Like' document.
    const likedVideos = likes.map(like => like.video);

    return res
        .status(200)
        .json(new ApiResponse(
            200, 
            likedVideos, 
            "Liked videos fetched successfully"
        ));
})

export {
    toggleVideoLike,
    toggleCommentLike,
    getLikedVideos
}