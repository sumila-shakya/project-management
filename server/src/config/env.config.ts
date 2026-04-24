declare global {
    namespace NodeJS {
        interface ProcessEnv {
            PORT: string,
            DB_HOST: string,
            DB_USER: string,
            DB_PASSWORD: string,
            DB_NAME: string,
            MONGODB_URI: string,
            ACCESS_TOKEN_SECRET: string,
            REFRESH_TOKEN_SECRET: string,
            MAIL_HOST: string,
            MAIL_PORT: string,
            MAIL_USER: string,
            MAIL_PASS: string,
            MAIL_FROM: string,
            CLIENT_URL: string
        }
    }
}

export {}