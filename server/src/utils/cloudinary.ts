import { v2 as cloudinary } from "cloudinary";
import fs from 'fs'

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

export const uploadOnCloudinary = async(localFilePath: string) => {
    try {
        if(!localFilePath) {
            return null
        }

        const uploadResult = await cloudinary.uploader.upload(localFilePath, {
            'resource_type': 'auto',
            'folder': 'project_management/task_assets',
            'access_mode': 'public'
        })

        console.log("File uploaded successfully to ", uploadResult.secure_url)
        fs.unlinkSync(localFilePath)

        return uploadResult
    } catch(error) {
        console.error("File upload failure: ", error)
        fs.unlinkSync(localFilePath)
        return null
    }
}