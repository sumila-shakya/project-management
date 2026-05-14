import mongoose from "mongoose";
import { ACTIONS } from "../utils/constants";
import { IAnalyticsLog } from "../@types/interface";

const analyticsSchema = new mongoose.Schema<IAnalyticsLog>({
    taskId: {
        type: String, 
        required: true,
        index: true
    },
    userId: {
        type: String, 
        required: true
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
    timestamp: {
        type: Date,
        required: true,
        default: Date.now,
    },
})

export const AnalyticsLog = mongoose.model<IAnalyticsLog>('AnalyticsLog', analyticsSchema)