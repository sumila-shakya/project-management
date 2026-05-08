import { TaskStatus } from "../@types/interface";

export const statusTransition: Record<TaskStatus, TaskStatus[]> = {
    'todo': ['in_progress'],
    'in_progress': ['in_review'],
    'in_review': ['completed'],
    'completed': []
}