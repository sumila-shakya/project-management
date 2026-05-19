import { ROLE, TASK_STATUS, ACTIONS,  ALLOWED_MIME_TYPES, ALLOWED_FILE_TYPE} from "../utils/constants"
// authenticated user
export interface Payload {
    userId: number
}

export type Role = typeof ROLE[number]

export type TaskStatus = typeof TASK_STATUS[number]

export type Actions = typeof ACTIONS[number]

export type MimeType = typeof ALLOWED_MIME_TYPES[number]

export type FileType = typeof ALLOWED_FILE_TYPE[number]

export interface IChanges {
    field: string,
    oldValue: unknown,
    newValue: unknown
}

export interface ActorMetaData {
    userId: string,
    userName: string,
    role: Role
}

export interface ProjectMetaData {
    projectId: string,
    projectName: string
}

export interface TeamMetaData {
    teamId: string,
    teamName: string
}

export interface TaskMetaData {
    taskId: string,
    taskName: string
}

export interface IAnalyticsLog {
    actor: ActorMetaData,
    target: TaskMetaData,
    action: Actions,
    changes?: IChanges[],
    team: TeamMetaData,
    project: ProjectMetaData,
    timestamp: Date
}

export interface FileMetaData {
    localFilePath: string,
    mimetype: MimeType,
    fileSize: number,
    fileName: string
}