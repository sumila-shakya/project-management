import { db } from "../config/mysql.config";
import { taskAssets, tasks, NewTaskAssets } from "../models/mysql.model";
import { eq, and } from "drizzle-orm";
import { ApiError } from "../utils/apiError";
import { taskGuard } from "./task.service";
import { FileType, FileMetaData } from "../@types/interface";
import { getFileType } from "../utils/file-helper";
import { ALLOWED_FILE_SIZE } from "../utils/constants";
import { uploadOnCloudinary } from "../utils/cloudinary";

export const taskAssetsServices = {
    async attachAsset(userId: number, taskId: number, fileData: FileMetaData) {
        const existingTask = await taskGuard.validateAccess(userId, taskId)

        // validate the file
        const fileType: FileType = getFileType(fileData.mimetype)
        const fileMaxSize: number = ALLOWED_FILE_SIZE[fileType]

        if(fileData.fileSize > fileMaxSize) {
            throw new ApiError(413, "File Size too large")
        }

        const uploadedResult = await uploadOnCloudinary(fileData.localFilePath)

        if(!uploadedResult) {
            throw new ApiError(500, "File upload failed")
        }

        const newAsset: NewTaskAssets = {
            taskId: existingTask.taskId,
            fileName: fileData.fileName,
            fileUrl: uploadedResult.secure_url,
            fileSize: fileData.fileSize,
            uploadedBy: userId
        }

        const [result] = await db
        .insert(taskAssets)
        .values(newAsset)

        return {
            assetId: result.insertId,
            uploadedAt: new Date(),
            ...newAsset
        }
    }
}