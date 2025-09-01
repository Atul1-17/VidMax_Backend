import {asyncHandler} from "../utils/asyncHandler.js"
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import {uploadOnCloudinary, deleteFromCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken"
import mongoose from "mongoose"

const generateAccessAndRefreshToken  = async (userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({validateBeforeSave : false})

        return {accessToken, refreshToken}

    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating access and refresh toke")
    }
}

const registerUser = asyncHandler( async (req, res) => {
    // get user details from frontend
    // validation - not empty
    // check if user already exists: username, email
    // check for imagess and check for avatar
    // upload them to cloudinary: avatar validation
    // create user object - create entry in db
    // remove password and refresh token field from the response
    // check fro user creation
    // return res 

    const {fullname, username, email, password}  = req.body 

    //console.log("email:", email);

    // if (fullname === "") {
    //     throw new ApiError(400, "fullname is required")
    // }

    if (
        [fullname, email, username, password].some((field) => field?.trim() === "")
        // we can use map in place of some
    ) {
        throw new ApiError(400, "All fields are required")
    }

    const existedUser = await User.findOne({
        $or: [{username}, {email}]
    })

    if (existedUser) {
        throw new ApiError(409, "User with email or username already exists")
    }

    //const avatarLocalPath = req.files?.avatar[0]?.path;

    let avatarLocalPath;
    if (req.files && Array.isArray(req.files.avatar) && req.files.avatar.length > 0) {
        avatarLocalPath = req.files.avatar[0].path
    }

    //const coverImageLocalPath = req.files?.coverImage[0]?.path;

    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path
    }

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)

    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!avatar) {
        throw new ApiError(400, "Avatar file is required")
    }

    const user = await User.create({
        fullname,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        avatarPublicId: avatar.public_id,
        coverPublicId: coverImage.public_id,
        username: username.toLowerCase()
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )
    //console.log(createdUser)

    if (!createdUser) {
        throw new ApiError(400, "something went wrong while registering the user")
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered Successfully")
    )

})

const loginUser = asyncHandler(async (req, res) => {
    // req body -> data
    // username or email
    // find the user
    // password check
    // access and refresh token
    // send cookie

    const {email, username, password} = req.body

    if (!email && !username) {
        throw new ApiError(400, "username or email is required")
    }

    const user = await User.findOne({
        $or: [{username}, {email}]
    })

    if (!user) {
        throw new ApiError(404, "User does not exist")
    }

    const isPasswordValid = await user.isPasswordCorrect(password)

    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid user credentials") 
    }
    

    const {accessToken, refreshToken} = await generateAccessAndRefreshToken(user._id)

    const loggedInUser = await User.findById(user._id)
    .select("-password -refreshToken") // we can also update the previous user to not make the databse call

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(
            200,
            {
                user: loggedInUser, accessToken, refreshToken
            },
            "User logged in successfully"
        )
    )


})

const logoutUser = asyncHandler(async (req, res) => {

    // removing the refresh token from the database 
    await User.findByIdAndUpdate(req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    // clearing the cookies
    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User Logged Out"))

})

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if (!incomingRefreshToken) {
        throw new ApiError(401, "unauthorized request")
    }

    try {
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)
    
        const user = await User.findById(decodedToken?._id) 
    
        if (!user) {
            throw new ApiError(401, "Invalid refresh token ")
        }
    
        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Refres")
        }
    
        const options = {
            httpOnly: true,
            secure: true
        }
    
        const {accessToken, newRefreshToken} = await generateAccessAndRefreshToken(user._id)
    
        return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newRefreshToken, options)
        .json(
            new ApiResponse(200,{accessToken, newRefreshToken},"Access token Refreshed"
            )
        )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token")
    }
})

const changeCurrentPassword = asyncHandler(async (req, res) => {
    const {oldPassword, newPassword} = req.body

    const user = await User.findById(req.user?._id)

    const isPasswordCorrect = user.isPasswordCorrect(oldPassword)

    if (!isPasswordCorrect) {
        throw new ApiError(400, "Invalid Old Password")
    }

    user.password = newPassword
    await user.save({validateBeforeSave: false})

    return res
    .status(200)
    .json(new ApiResponse(
        200,
        {},
        "Password Changed Successfully"
    ))
})

const getCurrentUser = asyncHandler(async (req, res) => {
    const user = req.user

    if (!user) {
        throw new ApiError(404, "User not found")
    }
    return res
    .status(200)
    .json(new ApiResponse(
        200,
        {user},
        "Current User Fetched Successfully"
    ))
})

// why we use async in side the callback function because their can be the need of await
const updateAccountDetailes = asyncHandler(async (req, res) => {
    const {email, fullname} = req.body

    if (!email || !fullname) {
        throw new ApiError(400, "email and fullname is required")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                email,
                fullname // fullname: fullname
            }
        },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(
        200,
        user,
        "Account details updated successfully"
    ))
})

const updateUserAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.file?.path
    const user = req.user
    
    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is missing")
    }

    const oldAvatarPublicId = user.avatarPublicId

    if (!oldAvatarPublicId) {
        throw new ApiError(400, "Avatar publicId does not found")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if (!avatar?.url) {
        throw new ApiError(400, "Failed to upload on cloudinary")
    }

    const newUser = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: avatar.url,
                avatarPublicId: avatar.public_id
            }
        },
        {new: true}
    ).select("-password")

    await deleteFromCloudinary(oldAvatarPublicId)

    return res
    .status(200)
    .json(new ApiResponse(
        200,
        newUser,
        "Avatar updated successfully"
    ))
})

const updateUserCoverImage = asyncHandler(async (req, res) => {

    const coverImageLocalPath = req.file?.path

    if (!coverImageLocalPath) {
        throw new ApiError(400, "CoverImage is missing")
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!coverImage.url) {
        throw new ApiError(200, "coverImage url not found")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                coverImage : coverImage.url
            }
        },
        {
            new: true
        }
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(
        200,
        user,
        "coverImage updated successfully"
    ))
})

const getUserChannelProfile = asyncHandler(async (req, res) => {

    const {username} = req.params

    if (!username?.trim()) {
        throw new ApiError(400, "Username is missing")
    }

    const channel = await User.aggregate([
        {
            // filter the user that required from the document return only one document
            $match: {
                username: username?.toLowerCase()
            }
        },
        {
            // join the two model based on conditions 
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",    
                as: "subscribers"
            }
        },
        {
            // join the two model based on conditions 
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            // used to add new field in the databse
            $addFields: {
                subscribersCount: {
                    $size: "$subscribers"
                },
                channelSubscribedCount: {
                    $size: "$subscribedTo"
                },
                isSubscribed: {
                    $cond: {
                        if: {$in: [req.user?._id, "$subscribers.subscribe"]},
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            // only return required field
            $project: {
                username: 1,
                fullname: 1,
                subscribersCount: 1,
                channelSubscribedCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1,
                email: 1
            }
        }
    ])
    

    if (!channel?.length) {
        throw new ApiError(404, "channel does not exist")
    }

    return res
    .status(200)
    .json(new ApiResponse(
        200,
        channel[0],
        "User channel fetched successfully"
    ))
})

const addToWatchHistory = asyncHandler(async (req, res) => {
    const {videoId} = req.params

    if (!videoId) {
        throw new ApiError(400, "VideoId not found")
    }

    if (!req.user?._id) {
        throw new ApiError(401, "Unauthorized request ")
    }

    const user = await User.findByIdAndUpdate(req.user._id,
        {
            // Use the $addToSet operator to add the videoId to the watchHistory array.
            // $addToSet is great because it ONLY adds the ID if it's not already in the array.
            // This prevents duplicate entries if a user re-watches a video.

            $addToSet: {
                watchHistory: videoId
            }
        },
        {
            new: true // This option tells MongoDB to return the updated user document
        }
    )

    if (!user) {
        throw new ApiError(404, "User not found");
    }

    return res
    .status(200)
    .json(new ApiResponse(
            200,
            { watchHistory: user.watchHistory },
            "Video added to watch history successfully"
    ))
})

const getWatchHistory = asyncHandler(async (req, res) => {
    // Start a MongoDB aggregation pipeline on the User collection.
    // An aggregation pipeline is a series of stages that process documents.
    const user = await User.aggregate([
        // Stage 1: Find the specific user document.
        {
            $match: {
                // We match the document by its unique _id.
                // req.user._id is added by the authentication middleware and contains the logged-in user's ID.
                // We must convert the string ID into a MongoDB ObjectId type for a correct match.
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        // Stage 2: Join with the 'videos' collection to get details of watched videos.
        {
            $lookup: {
                from: "videos", // The collection to join with.
                localField: "watchHistory", // The field from the User document (contains an array of video IDs).
                foreignField: "_id", // The field from the 'videos' collection to match against.
                as: "watchHistory", // The name for the new array field that will contain the joined video documents.
                
                // A sub-pipeline to process the joined video documents further.
                pipeline: [
                    // Stage 2a: For each video, join with the 'users' collection to get the owner's details.
                    {
                        $lookup: {
                            from: "users", // The collection to join with.
                            localField: "owner", // The field from the Video document (contains the owner's user ID).
                            foreignField: "_id", // The field from the 'users' collection to match against.
                            as: "owner", // The name for the new array field that will contain the owner's details.
                           
                            // Another sub-pipeline to process the owner's document.
                            pipeline: [
                                // Stage 2aa: Select only the necessary fields from the owner's document.
                                // This is good for security (avoids exposing sensitive data) and reduces response size.
                                {
                                    $project: {
                                        fullname: 1, // Include fullname
                                        username: 1, // Include username
                                        avatar: 1    // Include avatar
                                    }
                                }
                            ]
                        }
                    },
                    // Stage 2b: De-structure the 'owner' array.
                    {
                        $addFields: {
                            // $lookup always returns an array for the 'as' field. Since each video has only one owner,
                            // the 'owner' field will look like: [ { owner_details } ].
                            // This stage uses $first to take the first element of that array,
                            // transforming it into a single object: { owner_details }.
                            owner: {
                                $first: "$owner"
                            }
                        }  
                    }
                ]
            }
        }
    ]);

    // Send the successful response back to the client.
    return res
    .status(200)
    .json(new ApiResponse(
        200,
        // The result of an aggregation is always an array. Since we matched a unique _id,
        // our user is the first (and only) element in the 'user' array.
        // We access the populated 'watchHistory' field from that user object.
        user[0].watchHistory,
        "Watch history fetched successfully"
    ));
});


export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetailes,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    addToWatchHistory,
    getWatchHistory
}