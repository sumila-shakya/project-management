import mongoose from "mongoose";
import { ACTIONS } from "../utils/constants";

const analyticsSchema = new mongoose.Schema({
    taskId: {
        type: Number, 
        required: true,
        index: true
    },
    userId: {
        type: Number, 
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

export const AnalyticsLog = mongoose.model('AnalyticsLog', analyticsSchema)