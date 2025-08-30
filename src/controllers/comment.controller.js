import mongoose, { isValidObjectId } from "mongoose"
import {Comment} from "../models/comment.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const getVideoComments = asyncHandler(async (req, res) => {
    const {videoId} = req.params
    const {page = 1, limit = 10} = req.query
    
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid  Video ID")
    }

    const commentsAggregate = Comment.aggregate([
        {
            $match: {
                video: new mongoose.Types.ObjectId(videoId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "ownerDetails"
            }
        },
        {
            $unwind: "$ownerDetails"
        },
        {
            // sortin comment by newest first
            $sort: {
                createdAt: -1
            }
        },
        {
            $project: {
                _id: 1,
                content: 1,
                createdAt: 1,
                owner: {
                    _id: "$ownerDetails._id",
                    username: "$ownerDetails.username",
                    avatar: "$ownerDetails.avatar"
                }
            }
        }
    ])

    const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        customLabels: {
            docs: 'comments', // Rename 'docs' to 'comments' in the output
            totalDocs: 'totalComments'
        }
    };

    // 4. Execute the aggregation with pagination
    const paginatedComments = await Comment.aggregatePaginate(commentsAggregate, options);

    if (!paginatedComments || paginatedComments.comments.length === 0) {
        return res
            .status(200)
            .json(new ApiResponse(200, paginatedComments, "No comments found for this video"));
    }

    // 5. Return the paginated results
    return res
        .status(200)
        .json(new ApiResponse(
            200,
            paginatedComments,
            "Comments fetched successfully"
        ));
})

const addComment = asyncHandler(async (req, res) => {
    const {videoId} = req.params
    const {content} = req.body

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Inavalis video ID")
    }

    if (!content || content.trim() === "") {
        throw new ApiError(400, "Comment content cannot be empty")
    }

    const comment = await Comment.create({
        content,
        video: videoId,
        owner: req.user._id
    })

    if (!comment) {
        throw new ApiError(500, "Failed to add comment, please try again")
    }

    return res
    .status(201)
    .json(new ApiResponse(
        201,
        comment,
        "Successfully added comment"
    ))
})

const updateComment = asyncHandler(async (req, res) => {
    const {commentId} = req.params
    const {content} = req.body

    if (!isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid Comment ID")
    }

    if (!content || content.trim() === "") {
        throw new ApiError(400, "Comment content cannot be empty")
    }

    const comment = await Comment.findById(commentId)

    if (!comment) {
        throw new ApiError(400, "Comment not found")
    }

    if (comment?.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You can not update this comment")
    }

    const updatedComment = await Comment.findByIdAndUpdate(commentId,
        {
            $set: {
                content
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
        updatedComment,
        "Comment updated successfully"
    ))
})

const deleteComment = asyncHandler(async (req, res) => {
    const {commentId} = req.params

    if (!isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid Comment ID")
    }

    const comment = await Comment.findById(commentId)

    if (!comment) {
        throw new ApiError(404, "Comment not found")
    }

    if (comment.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You can not delete this comment")
    }

    await Comment.findByIdAndDelete(commentId)

    return res
    .status(200)
    .json(new ApiResponse(
        200,
        {},
        "Comment Deleted Successfully"
    ))
})

export {
    getVideoComments, 
    addComment, 
    updateComment,
    deleteComment
}