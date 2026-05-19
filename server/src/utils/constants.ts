export const ROLE = ['admin', 'member', 'team_leader'] as const
export const PROJECT_STATUS = ['active', 'archived'] as const
export const TASK_STATUS = ['todo', 'in_progress', 'in_review', 'completed'] as const
export const TASK_PRIORITY = ['low', 'medium', 'high', 'urgent'] as const
export const INVITATION_STATUS = ['pending', 'accepted', 'rejected'] as const
export const PROCESS_INVITATION_STATUS = ['accepted', 'rejected'] as const
export const ACTIONS = ['created', 'updated', 'deleted', 'completed', 'commented', 'assigned'] as const
export const ALLOWED_FILE_TYPE = ['images', 'documents', 'text', 'archives', 'video'] as const
export const COOKIES_OPTIONS = {
    httpOnly: true,
    maxAge: 7*24*60*60*1000,
    sameSite: "strict" as const
} as const

export const ALLOWED_FILE_SIZE = {
    images: 5*1024*1024,
    documents: 10*1024*1024,
    text: 5*1024*1024,
    archives: 20*1024*1024,
    video: 100*1024*1024,
} as const

export const ALLOWED_MIME_TYPES = [
    // Images
    'image/jpeg',
    'image/png', 
    'image/gif',
    'image/webp',
    'image/svg+xml',

    // Documents
    'application/pdf',
    'application/msword',                                                  
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 
    'application/vnd.ms-excel',                                                
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',       
    'application/vnd.ms-powerpoint',                                           
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',

    // Text
    'text/plain',
    'text/csv',
    'text/markdown',

    // Archives
    'application/zip',
    'application/x-zip-compressed',

    // Video
    'video/mp4',
    'video/webm',
] as const