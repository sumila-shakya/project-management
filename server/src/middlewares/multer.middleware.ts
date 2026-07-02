import multer from "multer";
import { ALLOWED_MIME_TYPES } from "../utils/constants";
import { ApiError } from "../utils/apiError";

// configure the storage
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

    // define the maximum limit of the file size
    limits: {fileSize: 100*1024*1024},

    // filter the file tyep
    fileFilter: (req, file, cb) => {
        if(ALLOWED_MIME_TYPES.includes(file.mimetype as any)) {
            cb(null, true)
        } else {
            cb(new ApiError(415,`File of mime type ${file.mimetype} is not supported`))
        }
    }
})