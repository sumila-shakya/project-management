import { FileType, MimeType } from "../@types/interface"

export const getFileType = (mimetype: MimeType): FileType => {
    if(mimetype.startsWith('image/')) return 'images'
    if(mimetype.startsWith('text/')) return 'text'
    if(mimetype.startsWith('video/')) return 'video'
    if(mimetype.includes('zip')) return 'archives'
    return 'documents'
}