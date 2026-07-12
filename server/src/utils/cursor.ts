import { CommentCursor, LogCursor, NotificationCursor } from "../@types/interface"

export const encodeCommentCursor = (paginationData: CommentCursor): string => {
    const cursorString: string = JSON.stringify(paginationData)
    const encodedString: string = Buffer.from(cursorString, 'utf-8').toString('base64url')

    return encodedString
}

export const decodeCommentCursor = (cursor: string): CommentCursor => {
    const decodedString: string = Buffer.from(cursor, 'base64url').toString('utf-8')
    const paginationData: CommentCursor = JSON.parse(decodedString)

    return paginationData
}

export const encodeLogCursor = (paginationData: LogCursor): string => {
    const cursorString: string = JSON.stringify(paginationData)
    const encodedString: string = Buffer.from(cursorString, 'utf-8').toString('base64url')

    return encodedString
}

export const decodeLogCursor = (cursor: string): LogCursor => {
    const decodedString: string = Buffer.from(cursor, 'base64url').toString('utf-8')
    const paginationData: LogCursor = JSON.parse(decodedString)

    return paginationData
}

export const encodeNotificationCursor = (paginationData: NotificationCursor): string => {
    const cursorString: string = JSON.stringify(paginationData)
    const encodedString: string = Buffer.from(cursorString, 'utf-8').toString('base64url')

    return encodedString
}

export const decodeNotificationCursor = (cursor: string): NotificationCursor => {
    const decodedString: string = Buffer.from(cursor, 'base64url').toString('utf-8')
    const paginationData: NotificationCursor = JSON.parse(decodedString)

    return paginationData
}