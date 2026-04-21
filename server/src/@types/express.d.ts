import { Request } from "express"
import { Payload } from "./interface"

declare module 'express-serve-static-core' {
  interface Request {
    user?: Payload
  }
}

export {}