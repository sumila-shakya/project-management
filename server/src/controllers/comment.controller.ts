import { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/apiError";
import { ApiResponse } from "../utils/apiResponse";
import { parseId } from "../utils/validate-id";
import { commentServices } from "../services/comment.service";
import { commentContentSchema, commentContentType } from "../validator/comment.validator";
import {cursorPaginationSchema, cursorPaginationType} from "../validator/global.validator"

export const commentController = {
    // ADD COMMENT CONTROLLER FUNCTION
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

            //validate the user data
            const commentContent: commentContentType = commentContentSchema.parse(req.body)

            // add the new comment
            const newComment = commentServices.addComment(authorId, taskId, commentContent)

            //send 201 success msg
            res
            .status(201)
            .json(new ApiResponse(201, newComment, "Comment added to task"))
        } catch(error) {
            next(error)
        }
    },

    // GET COMMENTS CONTROLLER FUNCTION
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

            // get the pagination data
            const paginationData: cursorPaginationType = cursorPaginationSchema.parse(req.query)

            // get the comments
            const allCommentsOnTask = await commentServices.getComments(userId, taskId, paginationData)

            // send 200 success msg
            res
            .status(200)
            .json(new ApiResponse(200, allCommentsOnTask))
        } catch(error) {
            next(error)
        }
    },

    // EDIT COMMENT CONTROLLER FUNCTION
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

            // validate the user data
            const commentContent: commentContentType = commentContentSchema.parse(req.body)

            // edit the comment
            const editedComment = await commentServices.editComment(authorId, commentId, commentContent)

            // send 200 success msg
            res
            .status(200)
            .json(new ApiResponse(200, editedComment, "Comment edited successfully"))
        } catch(error) {
            next(error)
        }
    },

    // DELETE COMMENT CONTROLLER FUNCTION
    async deleteComment(req: Request, res: Response, next: NextFunction) {
        try {
            // get the user id from the request
            const userId = req.user?.userId
            
            //if not the user id throw error
            if(!userId) {
                throw new ApiError(401, "Access Denied")
            }

            // parse the comment id
            const commentId = parseId(req.params.commentId as string)

            // delete the comment
            await commentServices.deleteComment(userId, commentId)

            // send 200 success msg
            res
            .status(200)
            .json(new ApiResponse(200, {}, "Comment deleted successfully"))
        } catch(error) {
            next(error)
        }
    }
}