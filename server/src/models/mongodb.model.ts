import mongoose from "mongoose";
import { ACTIONS, ROLE } from "../utils/constants";
import { IAnalyticsLog } from "../@types/interface";

const analyticsSchema = new mongoose.Schema<IAnalyticsLog>({
    actor: {
        userId: {type: String, required: true},
        userName: {type: String},
        role: {type: String, enum: ROLE}
    },
    target: {
        taskId: {type: String, required: true},
        taskName: {type: String}
    },
    action: {
        type: String, 
        enum: ACTIONS, 
        required: true
    },
    changes: [{
        field: {type: String},
        oldValue: {type: mongoose.Schema.Types.Mixed},
        newValue: {type: mongoose.Schema.Types.Mixed}
    }],
    team: {
        teamId: {type: String, required: true},
        teamName: {type: String}
    },
    project: {
        projectId: {type: String, required: true, index: true},
        projectName: {type: String}
    },
    timestamp: {
        type: Date,
        required: true,
        default: Date.now,
    },
})

analyticsSchema.index({'target.taskId': 1, 'timestamp': -1})
analyticsSchema.index({'team.teamId': 1, 'timestamp': -1})

export const AnalyticsLog = mongoose.model<IAnalyticsLog>('AnalyticsLog', analyticsSchema)