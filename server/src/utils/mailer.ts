import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: Number(process.env.MAIL_PORT),
    secure: false,
    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS
    }
})


export const sendResetPasswordMail = async (userEmail: string, resetToken: string) => {
    transporter.verify((error, success) => {
    if(error) {
        console.error('Mailtrap connection failed:', error)
    } else {
        console.log('Mailtrap connected successfully')
    }
})

    const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`

    const info = await transporter.sendMail({
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

    console.log("Email send sucessfully", info.messageId)
}