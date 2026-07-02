import { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/apiError";
import { ApiResponse } from "../utils/apiResponse";
import { parseId } from "../utils/validate-id";
import { taskAssetsServices } from "../services/task-assets.service";
import { FileMetaData, MimeType } from "../@types/interface";
import { filterAssetsSchema, filterAssetsType } from "../validator/assets.validator";
import fs from 'fs'

export const taskAssetsController = {
    // ATTACH ASSET CONTROLLER FUNCTION
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

            // throw error if the req.file is not set by the multer
            if(!req.file) {
                throw new ApiError(400, "No asset provided for the upload")
            }

            // construct the file meta data for the service fuction
            const fileDate: FileMetaData = {
                localFilePath: req.file.path,
                mimetype: req.file.mimetype as MimeType,
                fileName: req.file.filename,
                fileSize: req.file.size
            }

            // attach the asset
            const result = await taskAssetsServices.attachAsset(userId, taskId, fileDate)

            // send 201 success msg
            res
            .status(201)
            .json(new ApiResponse(201, result, "Asset attached to the task successfully"))
        } catch(error) {
            // delete the local asset in case of failure
            if(req.file) fs.unlinkSync(req.file.path)
            next(error)
        }
    },

    // GET ASSETS LIST CONTROLLER FUNCTION
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

            // grab the quey filters and the pagination data from the urlquery params
            const queryFilters: filterAssetsType = filterAssetsSchema.parse(req.query)

            // get the assets list
            const allTaskAssets = await taskAssetsServices.getTaskAssets(userId, taskId, queryFilters)

            // send 200 success msg
            res
            .status(200)
            .json(new ApiResponse(200, allTaskAssets))
        } catch(error) {
            next(error)
        }
    },

    // DOWNLOAD/VIEW ASSET CONTROLLER FUNCTION
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

            // get the cloudinary file url from the database
            const fileUrl = await taskAssetsServices.downloadAsset(userId, assetId)

            // redirect to the cloudinary url
            res
            .redirect(fileUrl)
        } catch(error) {
            next(error)
        }
    },

    // DELETE ASSET CONTROLLER FUNCTION
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

            // delete the asset
            await taskAssetsServices.deleteAsset(userId, assetId)

            res
            .status(200)
            .json(new ApiResponse(200, {}, "Asset deleted successfully"))
        } catch(error) {
            next(error)
        }
    }
}