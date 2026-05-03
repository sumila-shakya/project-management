import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { teamController, teamMembersController } from "../controllers/team.controller";
import { invitationController } from "../controllers/invitation.controller";
import { projectController } from "../controllers/project.controller";

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
// UPDATE THE TEAM
router.patch('/:teamId', teamController.updateTeam)

// DELETE THE TEAM
router.delete('/:teamId', teamController.deleteTeam)


/* ------------------------------------ TEAM MEMBERS ROUTES ------------------------------------ */
// GET ALL THE TEAM MEMBERS ROUTE
router.get('/:teamId/members', teamMembersController.getTeamMembers)

//only accesible by the admin
// SEND INVITATIONS ROUTE
router.post('/:teamId/invite', invitationController.sendInvitation)

// REMOVE THE TEAM MEMBER ROUTE
router.delete('/:teamId/members/:memberId', teamMembersController.removeMember)

// UPDATE THE TEAM MEMBER ROLE ROUTE
router.patch('/:teamId/members/:memberId/role', teamMembersController.updateMember)


/* ------------------------------------ TEAM MEMBERS ROUTES ------------------------------------ */
// CREATE PROJECT ROUTE
router.post('/:teamId/projects', projectController.createProject)

// GET ALL PROJECTS ROUTE
router.get('/:teamId/projects', projectController.getProjects)

export default router