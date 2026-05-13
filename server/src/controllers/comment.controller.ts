import { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/apiError";
import { ApiResponse } from "../utils/apiResponse";
import { parseId } from "../utils/validateId";
import { commentServices } from "../services/comment.service";
import { commentContentSchema, commentContentType } from "../utils/validator";

export const commentController = {
    async addComment(req: Request, res: Response, next:NextFunction) {
        try {
            // get the user id from the request
            const authorId = req.user?.userId
            
            //if not the user id throw error
            if(!authorId) {
                throw new ApiError(401, "Access Denied")
            }

            // parse the task id
            const taskId = parseId(req.params.taskId as string)

            const commentContent: commentContentType = commentContentSchema.parse(req.body)

            const newComment = commentServices.addComment(authorId, taskId, commentContent)

            res
            .status(201)
            .json(new ApiResponse(201, newComment, "Comment added to task"))
        } catch(error) {
            next(error)
        }
    },

    async getComments(req: Request, res: Response, next: NextFunction) {
        try {
            // get the user id from the request
            const userId = req.user?.userId
            
            //if not the user id throw error
            if(!userId) {
                throw new ApiError(401, "Access Denied")
            }

            // parse the task id
            const taskId = parseId(req.params.taskId as string)

            const allCommentsOnTask = await commentServices.getComments(userId, taskId)

            res
            .status(200)
            .json(new ApiResponse(200, allCommentsOnTask))
        } catch(error) {
            next(error)
        }
    },

    async editComment(req: Request, res: Response, next: NextFunction) {
        try {
            // get the user id from the request
            const authorId = req.user?.userId
            
            //if not the user id throw error
            if(!authorId) {
                throw new ApiError(401, "Access Denied")
            }

            // parse the comment id
            const commentId = parseId(req.params.commentId as string)

            const commentContent: commentContentType = commentContentSchema.parse(req.body)

            const editedComment = await commentServices.editComment(authorId, commentId, commentContent)

            res
            .status(200)
            .json(new ApiResponse(200, editedComment, "Comment edited successfully"))
        } catch(error) {
            next(error)
        }
    }
}