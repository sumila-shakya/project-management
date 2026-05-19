import multer from "multer";
import { ALLOWED_MIME_TYPES } from "../utils/constants";
import { ApiError } from "../utils/apiError";

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    }
})

export const upload = multer({
    storage,
    limits: {fileSize: 100*1024*1024},
    fileFilter: (req, file, cb) => {
        if(ALLOWED_MIME_TYPES.includes(file.mimetype as any)) {
            cb(null, true)
        } else {
            cb(new ApiError(415,`File of mime type ${file.mimetype} not supported`))
        }
    }
})