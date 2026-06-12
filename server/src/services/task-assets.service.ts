import { db } from "../config/mysql.config";
import { taskAssets, tasks, projects, teamMembers, NewTaskAssets, teams, users } from "../models/mysql.model";
import { eq, and, asc, count } from "drizzle-orm";
import { ApiError } from "../utils/apiError";
import { taskGuard } from "./task.service";
import { FileType, FileMetaData } from "../@types/interface";
import { getFileType } from "../utils/file-helper";
import { ALLOWED_FILE_SIZE, DEFAULT_PAGE_LIMIT } from "../utils/constants";
import { uploadOnCloudinary } from "../utils/cloudinary";
import { filterAssetsType } from "../utils/validator";
import { IAnalyticsLog } from "../@types/interface";
import { AnalyticsLog } from "../models/mongodb.model";

export const taskAssetsServices = {
    async attachAsset(userId: number, taskId: number, fileData: FileMetaData) {
        // validate the user access to the tasks
        const existingTask = await taskGuard.validateAccess(userId, taskId)

        // validate the file
        // get the file type or category
        const fileType: FileType = getFileType(fileData.mimetype)

        // get the file allowed size
        const fileMaxSize: number = ALLOWED_FILE_SIZE[fileType]

        // throw error if the file size exceeds the maximum capacity
        if(fileData.fileSize > fileMaxSize) {
            throw new ApiError(413, "File Size too large")
        }

        // upload the file to cloudinary
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

        const log: IAnalyticsLog = {
            actor: {
                userId: String(userId),
                userName: existingTask.userName,
                role: existingTask.role
            },
            target: {
                taskId: String(taskId),
                taskName: existingTask.title
            },
            action: 'asset_attached',
            changes: [{
                field: 'asset',
                oldValue: null,
                newValue: {
                    assetId: String(result.insertId),
                    fileCategory: fileType,
                    fileName: fileData.fileName,
                    fileSize: fileData.fileSize,
                }
            }],
            team: {
                teamId: String(existingTask.teamId),
                teamName: existingTask.teamName
            },
            project: {
                projectId: String(existingTask.projectId),
                projectName: existingTask.projectName
            },
            timestamp: new Date()
        }

        await AnalyticsLog.create(log)

        return {
            assetId: result.insertId,
            uploadedAt: new Date(),
            ...newAsset
        }
    },

    async getTaskAssets(userId: number, taskId: number, queryFilters: filterAssetsType) {
        const page = queryFilters.page || 1
        const limit = queryFilters.limit || DEFAULT_PAGE_LIMIT
        const offset = (page - 1)*limit

        // get the existing task
        const [existingTask] = await db
        .select({
            taskId: tasks.taskId,
            projectId: tasks.projectId,
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

        const filters = [eq(taskAssets.taskId, taskId)]
        
        if(queryFilters.fileCategory) {
            filters.push(eq(taskAssets.fileCategory, queryFilters.fileCategory))
        }

        const [allTaskAssets, [assetCount]] = await Promise.all([
            db
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
            .orderBy(asc(taskAssets.assetId))
            .offset(offset)
            .limit(limit),

            db
            .select({
                total: count()
            })
            .from(taskAssets)
            .where(and(...filters))
        ])

        return {
            paginationInfo: {
                totalTeamCount: assetCount.total,
                totalPages: Math.ceil(assetCount.total/limit),
                page: page,
                limit: limit
            },
            allTaskAssets
        }
    },

    async downloadAsset(userId: number, assetId: number) {
        const [existingAsset] = await db
        .select({
            assetId: taskAssets.assetId,
            fileUrl: taskAssets.fileUrl,
            role: teamMembers.role
        })
        .from(taskAssets)
        .innerJoin(tasks, eq(taskAssets.taskId, tasks.taskId))
        .innerJoin(projects, eq(tasks.projectId, projects.projectId))
        .innerJoin(teamMembers, eq(projects.teamId, teamMembers.teamId))
        .where(and(
            eq(taskAssets.assetId, assetId),
            eq(teamMembers.userId, userId)
        ))

        if(!existingAsset) {
            throw new ApiError(403, "Access Denied")
        }

        return existingAsset.fileUrl
    },

    async deleteAsset(userId: number, assetId: number) {
        const [existingAsset] = await db
        .select({
            assetId: taskAssets.assetId,
            fileCategory: taskAssets.fileCategory,
            fileName: taskAssets.fileName,
            fileSize: taskAssets.fileSize,
            uploadedBy: taskAssets.uploadedBy,
            taskId: tasks.taskId,
            taskName: tasks.title,
            projectId: projects.projectId,
            projectName: projects.projectName,
            projectStatus: projects.projectStatus,
            teamId: teams.teamId,
            teamName: teams.teamName,
            userName: users.name,
            role: teamMembers.role
        })
        .from(taskAssets)
        .innerJoin(tasks, eq(taskAssets.taskId, tasks.taskId))
        .innerJoin(projects, eq(tasks.projectId, projects.projectId))
        .innerJoin(teams, eq(projects.teamId, teams.teamId))
        .innerJoin(teamMembers, eq(teams.teamId, teamMembers.teamId))
        .innerJoin(users, eq(teamMembers.userId, users.userId))
        .where(and(
            eq(taskAssets.assetId, assetId),
            eq(teamMembers.userId, userId)
        ))

        if(!existingAsset) {
            throw new ApiError(403, "Access Denied")
        }

        if(existingAsset.role !== 'admin' && existingAsset.uploadedBy !== userId) {
            throw new ApiError(403, "Access Denied")
        }

        if(existingAsset.projectStatus === 'archived') {
            throw new ApiError(403, "Access denied")
        }

        const log: IAnalyticsLog = {
            actor: {
                userId: String(userId),
                userName: existingAsset.userName,
                role: existingAsset.role
            },
            target: {
                taskId: String(existingAsset.taskId),
                taskName: existingAsset.taskName
            },
            action: 'asset_deleted',
            changes: [{
                field: 'asset',
                oldValue: {
                    assetId: String(assetId),
                    fileCategory: existingAsset.fileCategory,
                    fileName: existingAsset.fileName,
                    fileSize: existingAsset.fileSize,
                },
                newValue: null
            }],
            team: {
                teamId: String(existingAsset.teamId),
                teamName: existingAsset.teamName
            },
            project: {
                projectId: String(existingAsset.projectId),
                projectName: existingAsset.projectName
            },
            timestamp: new Date()
        }

        await db
        .delete(taskAssets)
        .where(eq(taskAssets.assetId, assetId))


        await AnalyticsLog.create(log)
    }
}