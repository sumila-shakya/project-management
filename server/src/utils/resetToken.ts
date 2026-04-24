import crypto from 'crypto'

//generate reset token
export const generateResetToken = (): string => {
    return crypto.randomBytes(16).toString('hex')
}

//hash reset token
export const hashToken = (data: string): string => {
    return crypto
    .createHash('sha256')
    .update(data)
    .digest('hex')
}

