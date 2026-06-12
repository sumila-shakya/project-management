import { CursorData } from "../@types/interface"

export const encodeCursor = (paginationData: CursorData): string => {
    const cursorString: string = JSON.stringify(paginationData)
    const encodedString: string = Buffer.from(cursorString, 'utf-8').toString('base64url')

    return encodedString
}

export const decodeCursor = (cursor: string): CursorData => {
    const decodedString: string = Buffer.from(cursor, 'base64url').toString('utf-8')
    const paginationData: CursorData = JSON.parse(decodedString)

    return paginationData
}