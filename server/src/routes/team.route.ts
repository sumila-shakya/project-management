import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { teamController, teamMembersController } from "../controllers/team.controller";
import { invitationController } from "../controllers/invitation.controller";

const router = Router()

// authenticate the user
router.use(authMiddleware)

/* ------------------------------------ TEAM CRUD ROUTES ------------------------------------ */
// TEAM CREATION ROUTE
router.post('/', teamController.createTeam)

// GET ALL TEAMS ROUTE
router.get('/', teamController.getTeams)

// GET TEAM BY ID ROUTE
router.get('/:teamId', teamController.getTeamsById)

//only accessible by the admin
router.patch('/:teamId', teamController.updateTeam)
router.delete('/:teamId', teamController.deleteTeam)

/* ------------------------------------ TEAM MEMBERS ROUTES ------------------------------------ */
router.get('/:teamId/members', teamMembersController.getTeamMembers)

router.post('/:teamId/invite', invitationController.sendInvitation)

//only accesible by the admin
router.delete('/:teamId/members/:memberId', teamMembersController.removeMember)
router.patch('/:teamId/members/:memberId/role', teamMembersController.updateMember)

export default router