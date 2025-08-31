import mongoose, {isValidObjectId, mongo} from "mongoose"
import {Subscription} from "../models/subscription.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const toggleSubscription = asyncHandler(async (req, res) => {
    const {channelId} = req.params
    
    if (!isValidObjectId(channelId)) {
        throw new ApiError(400, "Inavlid Channel ID")
    }

    const subscriberId = req.user._id

    if (channelId.toString() === subscriberId.toString()) {
        throw new ApiError(400, "You cannot subscribe to your own channel");
    }

    const subscription = await Subscription.findOne({
        subscriber: subscriberId,
        channel: channelId
    })

    if (subscription) {
        await Subscription.findByIdAndDelete(subscription._id)

        return res
        .status(200)
        .json(new ApiResponse(
            200,
            {subscribed: false},
            "Unsubscribed successfully"
        ))
    } else {
        await Subscription.create({
            subscriber: subscriberId,
            channel: channelId
        })

        return res
        .status(201)
        .json(new ApiResponse(
            201,
            {subscribed: true},
            "SUbscribed successfully"
        ))
    }
})

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const {channelId} = req.params

    if (!isValidObjectId(channelId)) {
        throw new ApiError(400, "Invalid Channel ID")
    }

    const subscribers = await Subscription.aggregate([
        {
            $match: {
                channel: new mongoose.Types.ObjectId(channelId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "subscriber",
                foreignField: "_id",
                as: "subscriberDetails"
            }
        },
        {
            $unwind: "$subscriberDetails"
        },
        {
            $project: {
                _id: "$subscriberDetails._id",
                fullName: "$subscriberDetails.fullName",
                username: "$subscriberDetails.username",
                avatar: "$subscriberDetails.avatar"
            }
        }
    ])

    return res
    .status(200)
    .json(new ApiResponse(
        200,
        subscribers,
        "Subscribers list fetched successfully"
    ))
})

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params
    
    if (!isValidObjectId(subscriberId)) {
        throw new ApiError(400, "Invalid subscriber ID")
    }

    const channels = await Subscription.aggregate([
        {
            $match: {
                subscriber: new mongoose.Types.ObjectId(subscriberId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "channel",
                foreignField: "_id",
                as: "channelDetails"
            }
        },
        {
            $unwind: "$channelDetails"
        },
        {
            $project: {
                _id: "$channelDetails._id",
                username: "$channelDetails.username",
                fullName: "$channelDetails.fullname",
                avatar: "$channelDetails.avatar"
            }
        }
    ])

    return res
    .status(200)
    .json(new ApiResponse(
        200,
        channels,
        "channels list fetched successfully"
    ))
})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}