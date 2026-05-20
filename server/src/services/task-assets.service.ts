import { db } from "../config/mysql.config";
import { taskAssets, tasks, projects, teamMembers, NewTaskAssets } from "../models/mysql.model";
import { eq, and } from "drizzle-orm";
import { ApiError } from "../utils/apiError";
import { taskGuard } from "./task.service";
import { FileType, FileMetaData } from "../@types/interface";
import { getFileType } from "../utils/file-helper";
import { ALLOWED_FILE_SIZE } from "../utils/constants";
import { uploadOnCloudinary } from "../utils/cloudinary";
import { filterAssetsType } from "../utils/validator";

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
            fileCategory: fileType,
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
    },

    async getTaskAssets(userId: number, taskId: number, queryFilters: filterAssetsType) {
        // get the existing task
        const [existingTask] = await db
        .select({
            taskId: tasks.taskId,
            projectId: tasks.projectId,
            projectStatus: projects.projectStatus,
            userRole: teamMembers.role
        })
        .from(tasks)
        .innerJoin(projects, eq(tasks.projectId, projects.projectId))
        .innerJoin(teamMembers, eq(projects.teamId, teamMembers.teamId))
        .where(and(
            eq(tasks.taskId, taskId),
            eq(teamMembers.userId, userId)
        ))
                
        // if task data does not exists throw error
        if(!existingTask) {
            throw new ApiError(403, "Access Denied")
        }
                
        // if the user is only the member do not allow to see the comments on task of archived projects
        if(existingTask.projectStatus === 'archived' && existingTask.userRole === 'member') {
            throw new ApiError(403, "Access Denied")
        }

        const filters = [eq(taskAssets.taskId, taskId)]
        
        if(queryFilters.fileCategory) {
            filters.push(eq(taskAssets.fileCategory, queryFilters.fileCategory))
        }

        const allTaskAssets = await db
        .select({
            assetId: taskAssets.assetId,
            fileCategory: taskAssets.fileCategory,
            fileName: taskAssets.fileName,
            fileSize: taskAssets.fileSize,
            uploadedBy: taskAssets.uploadedBy,
            uploadedAt: taskAssets.uploadedAt
        })
        .from(taskAssets)
        .where(and(...filters))

        return allTaskAssets
    }
}