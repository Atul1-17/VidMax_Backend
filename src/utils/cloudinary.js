import {v2 as cloudinary} from "cloudinary"
import fs from "fs"

// Configuration
cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_CLOUD_KEY, 
    api_secret: process.env.CLOUDINARY_CLOUD_SECRET
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null;
        
        //uploading the file to cloudinary
        const response = await cloudinary.uploader.upload(
            localFilePath, {
                resource_type: "auto"
            }
        )
        //file has been uploaded successfully
        //console.log ("file uploaded succefull on cloudinary", response.url)
        fs.unlinkSync(localFilePath)
        return response;

    } catch (error) {
        //removing the local saved temporary file as the uploading failed
        fs.unlinkSync(localFilePath)
        return null;
    }
}

const deleteFromCloudinary = async (publicId, resource_type) => {
    try {
        if (!publicId) {
            return null
        }

        const response = await cloudinary.uploader.destroy(
            publicId, {
                resource_type: resource_type
            }
        )

        return response;
        
    } catch (error) {
        console.log("Error while deleting file", error)
        return null;
    }
}


export {
    uploadOnCloudinary,
    deleteFromCloudinary
}