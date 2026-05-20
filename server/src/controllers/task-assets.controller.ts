import { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/apiError";
import { ApiResponse } from "../utils/apiResponse";
import { parseId } from "../utils/validate-id";
import { taskAssetsServices } from "../services/task-assets.service";
import { FileMetaData, MimeType } from "../@types/interface";
import { filterAssetsSchema, filterAssetsType } from "../utils/validator";
import fs from 'fs'

export const taskAssetsController = {
    async attachAsset(req: Request, res: Response, next: NextFunction) {
        try {
            // get the user id from the request
            const userId = req.user?.userId

            //if not the user id throw error
            if(!userId) {
                throw new ApiError(401, "Access Denied")
            }

            // get the taskId from the request params
            const taskId = parseId(req.params.taskId as string)

            if(!req.file) {
                throw new ApiError(400, "No asset provided for the upload")
            }

            const fileDate: FileMetaData = {
                localFilePath: req.file.path,
                mimetype: req.file.mimetype as MimeType,
                fileName: req.file.filename,
                fileSize: req.file.size
            }

            const result = await taskAssetsServices.attachAsset(userId, taskId, fileDate)

            res
            .status(201)
            .json(new ApiResponse(201, result, "Asset attached to the task successfully"))
        } catch(error) {
            // delete the local asset in case of failure
            if(req.file) fs.unlinkSync(req.file.path)
            next(error)
        }
    },

    async getTaskAssets(req: Request, res: Response, next: NextFunction) {
        try {
            // get the user id from the request
            const userId = req.user?.userId

            //if not the user id throw error
            if(!userId) {
                throw new ApiError(401, "Access Denied")
            }

            // get the taskId from the request params
            const taskId = parseId(req.params.taskId as string)

            const queryFilters: filterAssetsType = filterAssetsSchema.parse(req.query)

            const allTaskAssets = await taskAssetsServices.getTaskAssets(userId, taskId, queryFilters)

            res
            .status(200)
            .json(new ApiResponse(200, allTaskAssets))
        } catch(error) {
            next(error)
        }
    },

    async downloadAsset(req: Request, res: Response, next: NextFunction) {
        try {
            // get the user id from the request
            const userId = req.user?.userId

            //if not the user id throw error
            if(!userId) {
                throw new ApiError(401, "Access Denied")
            }

            // get the assetId from the request params
            const assetId = parseId(req.params.assetId as string)

            const fileUrl = await taskAssetsServices.downloadAsset(userId, assetId)

            res
            .redirect(fileUrl)
        } catch(error) {
            next(error)
        }
    },

    async deleteAsset(req: Request, res: Response, next: NextFunction) {
        try {
            // get the user id from the request
            const userId = req.user?.userId

            //if not the user id throw error
            if(!userId) {
                throw new ApiError(401, "Access Denied")
            }

            // get the assetId from the request params
            const assetId = parseId(req.params.assetId as string)

            await taskAssetsServices.deleteAsset(userId, assetId)

            res
            .status(200)
            .json(new ApiResponse(200, {}, "Asset deleted successfully"))
        } catch(error) {
            next(error)
        }
    }
}