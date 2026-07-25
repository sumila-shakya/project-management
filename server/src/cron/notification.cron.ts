import cron from 'node-cron'
import { taskServices } from '../services/task.service'

export const notifyDeadlines = () => {
    cron.schedule('0 * * * *', async() => {
        try {
            await taskServices.notifyDeadlineApproaching(1)
            await taskServices.notifyDeadlineApproaching(2)
            await taskServices.notifyDeadlineApproaching(3)
            await taskServices.notifyOverdueTask()

        } catch(error) {
            const message = error instanceof Error ? error.message: error
            console.error('Internal server error: ', message)
        }
    })
}