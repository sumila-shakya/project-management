import { db } from "../config/mysql.config";
import { users, teams, teamMembers, Team, NewTeam, NewTeamMember } from "../models/mysql.model";
import { createTeamType } from "../utils/validator";

export const teamServices = {
    // CREATE TEAM SERVICE FUNCTION
    async createTeam(userId: number, data: createTeamType) {
        const newTeam: NewTeam = {
            teamName: data.teamName,
            createdBy: userId,
            ...(data.description && {description: data.description})
        }

        // insert the new team into the database
        const [team] = await db
        .insert(teams)
        .values(newTeam)

        const newTeamMember: NewTeamMember = {
            teamId: team.insertId,
            userId: userId,
            role: 'admin'
        }

        // make the user the adminof the new team
        await db
        .insert(teamMembers)
        .values(newTeamMember)

        return {
            teamId: team.insertId,
            teamName: data.teamName,
            ...(data.description && {description: data.description})
        }
    }
}