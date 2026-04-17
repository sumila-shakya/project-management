import mongoose from "mongoose";

export const connectMongoDb = async () : Promise<void> => {
    try {
        await mongoose.connect(process.env.MONGODB_URI as string)
    } catch(error) {
        throw error
    }
}