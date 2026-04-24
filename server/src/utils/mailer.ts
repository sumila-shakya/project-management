import nodemailer from 'nodemailer'

// create the transporter
const transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: Number(process.env.MAIL_PORT),
    secure: false,
    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS
    }
})

// SEND EMAIL FUNCTION
export const sendResetPasswordMail = async (userEmail: string, resetToken: string) => {
    // verify the connection
    transporter.verify((error, success) => {
        if(error) {
            console.error('Mailtrap connection failed:', error)
        } else {
            console.log('Mailtrap connected successfully')
        }
    })

    const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`

    // send the email
    await transporter.sendMail({
        from: process.env.MAIL_FROM,
        to: userEmail,
        subject: "Password Reset Request",
        html: `
            <p>You requested a password reset</p>
            <p>Click the link to reset the password. It expires in 15 min</p>
            <a href="${resetUrl}">${resetUrl}</a>
            <p>If you didn't request this please, ignore this email.</p>
        `
    })
}

// SEND EMAIL FUNCTION
export const sendEmailVerificationMail = async (userEmail: string, verificationToken: string) => {
    // verify the connection
    transporter.verify((error, success) => {
        if(error) {
            console.error('Mailtrap connection failed:', error)
        } else {
            console.log('Mailtrap connected successfully')
        }
    })

    const verificationUrl = `${process.env.CLIENT_URL}/verify-email?token=${verificationToken}`

    // send the email
    await transporter.sendMail({
        from: process.env.MAIL_FROM,
        to: userEmail,
        subject: "Email Verification Request",
        html: `
            <p>Please verify your email</p>
            <p>Click the link to verify your email. It expires in 24 hrs</p>
            <a href="${verificationUrl}">${verificationUrl}</a>
            <p>If you didn't request this please, ignore this email.</p>
        `
    })
}