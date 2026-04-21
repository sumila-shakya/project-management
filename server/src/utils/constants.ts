export const ROLE = ['admin', 'member', 'team_leader'] as const
export const PROJECT_STATUS = ['active', 'archived'] as const
export const TASK_STATUS = ['todo', 'in_progress', 'in_review', 'completed'] as const
export const TASK_PRIORITY = ['low', 'medium', 'high', 'urgent'] as const
export const COOKIES_OPTIONS = {
    httpOnly: true,
    maxAge: 7*24*60*60*1000,
    sameSite: "strict" as const
} as const