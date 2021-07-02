import User from '../../models/user.js'
import Team from '../../models/team.js'
import checkAuth from '../../utils/checkAuth.js';
import userResolver from './userResolver.js';
import projectResolver from './projectResolver.js'
import { withFilter } from 'graphql-subscriptions'

const NEW_TEAM = "NEW_TEAM"
const ACCEPT_TEAM_INVITE = "ACCEPT_TEAM_INVITE"
const REJECT_TEAM_INVITE = "REJECT_TEAM_INVITE"

const resolvers = {
    Query: {
        verifiedTeams: async (_, __, context) => {
            console.log("verifiedteams");
            const user = await checkAuth(context)
            try {
                const userDetails = await User.findById(user._id)
                
                const verifiedTeams = await Team.find({ _id: { $in: userDetails.verifiedTeams } })

                if (!verifiedTeams) {
                    throw new Error(`Problem fetching teams`)
                }
                return verifiedTeams.map(team => {
                    return {
                        ...team._doc,
                        createdBy: userResolver.Query.userInfo(_, { userId: team.createdBy }),
                        members: userResolver.Query.usersInfo(_, { userIds: team.members }),
                        projects: projectResolver.Query.projectsInfo(_, { projectIds: team.projects })
                    }
                })
            }
            catch (err) {
                throw new Error(err)
            }
        },
        unverifiedTeams: async (_, __, context) => {
            console.log("unverifiedteams");
            const user = await checkAuth(context)
            try {
                const userDetails = await User.findById(user._id)

                const verifiedTeams = await Team.find({ _id: { $in: userDetails.unverifiedTeams } })

                if (!verifiedTeams) {
                    throw new Error(`Problem fetching teams`)
                }
                return verifiedTeams.map(team => {
                    return {
                        ...team._doc,
                        createdBy: userResolver.Query.userInfo(_, { userId: team.createdBy }),
                        members: userResolver.Query.usersInfo(_, { userIds: team.members })
                    }
                })
            }
            catch (err) {
                throw new Error(err)
            }
        },
    },
    Mutation: {
        newTeam: async (_, { teamName, members }, context) => {
            console.log("newTeam", teamName, members);
            const user = await checkAuth(context)
            const userDetails = await User.findById(user._id)
            const membersDetails = await User.find({ _id: { $in: members } })
            try {
                const team = await Team.findOne({ teamName })

                if (team) {
                    throw new Error("Team name already exists. Try new name.")
                }
                const newTeam = new Team({
                    teamName,
                    members: [user._id, ...members],
                    createdBy: user._id
                })
                const result = await newTeam.save()

                const creatorUpdate = await User.findByIdAndUpdate({ _id: user._id }, { $set: { verifiedTeams: [...userDetails.verifiedTeams, result._id] } }, { new: true })

                const update = membersDetails.map(async member => {
                    const membersUpdate = await User.findByIdAndUpdate({ _id: member._id }, { $set: { unverifiedTeams: [...member.unverifiedTeams, result._id] } }, { new: true })
                })

                await context.pubsub.publish(NEW_TEAM, {
                    newTeam: {
                        ...result._doc,
                        createdBy: userResolver.Query.userInfo(_, { userId: result.createdBy }),
                        members: userResolver.Query.usersInfo(_, { userIds: result.members }),
                        subscribers: [...members]
                    }
                })

                return {
                    ...result._doc,
                    createdBy: userResolver.Query.userInfo(_, { userId: result.createdBy }),
                    members: userResolver.Query.usersInfo(_, { userIds: result.members })
                }
            }
            catch (err) {
                throw new Error(err)
            }
        },
        acceptTeamInvite: async (_, { teamId }, context) => {
            console.log("acceptTeamInvite");
            const user = await checkAuth(context)
            const userDetails = await User.findById(user._id)
           
            try {
                const team = await Team.findById(teamId)

                const members = team.members.map(m => m.toString())

                if (!team) {
                    throw new Error("Team not found.")
                }

                const userUpdate = await User.findByIdAndUpdate(
                    { _id: user._id },
                    {
                        $set: {
                            verifiedTeams: [...userDetails.verifiedTeams, teamId],
                            unverifiedTeams: [ ...userDetails.unverifiedTeams.filter(team => team != teamId) ]
                        }
                    }, { new: true }
                )

                await context.pubsub.publish(ACCEPT_TEAM_INVITE, {
                    acceptTeamInvite: {
                        user: { ...userUpdate._doc } ,
                        teamId,
                        subscribers: [ ...members.filter(member => member !== user._id) ],
                    }
                })
                return {
                    user: userUpdate,
                    teamId,
                }
            }
            catch (err) {
                throw new Error(err)
            }
        },
        rejectTeamInvite: async (_, { teamId }, context) => {
            console.log("rejectTeamInvite");
            const user = await checkAuth(context)
            const userDetails = await User.findById(user._id)
           
            try {
                const team = await Team.findById(teamId)

                const members = team.members.map(m => m.toString())

                if (!team) {
                    throw new Error("Team not found.")
                }

                const teamUpdate = await Team.findByIdAndUpdate(
                    { _id: teamId },
                    {
                        $set: {
                            members: [ ...team.members.filter(member => member != user._id) ]
                        }
                    }, { new: true }
                )

                const userUpdate = await User.findByIdAndUpdate(
                    { _id: user._id },
                    {
                        $set: {
                            unverifiedTeams: [ ...userDetails.unverifiedTeams.filter(team => team != teamId) ]
                        }
                    }, { new: true }
                )

                await context.pubsub.publish(REJECT_TEAM_INVITE, {
                    rejectTeamInvite: {
                        user: { ...userUpdate._doc } ,
                        teamId,
                        subscribers: [ ...members.filter(member => member !== user._id) ],
                    }
                })

                return {
                    user: { ...userUpdate._doc },
                    teamId,
                }
            }
            catch (err) {
                throw new Error(err)
            }
        },
        newTeamMember: async (_, { teamId, newMemberId }, context) => {
            console.log("newTeamMember");

            try {
                const team = await Team.findById(teamId)
                if (!team) {
                    throw new Error("Team not")
                }
                if (team.members.includes(newMemberId)) {
                    throw new Error("Already a member of the team")
                }

                const result = await Team.findByIdAndUpdate({ _id: teamId }, { $set: { members: [...team.members, newMemberId] } }, { new: true })


                if (!result) {
                    throw new Error(`Problem updating team`)
                }

                return {
                    ...result._doc,
                    createdBy: userResolver.Query.userInfo(_, { userId: result.createdBy }),
                    members: userResolver.Query.usersInfo(_, { userIds: result.members })
                }
            }
            catch (err) {
                throw new Error(err)
            }
        },

    },
    Subscription: {
        newTeam: {
            subscribe: withFilter(
                (_, __, { pubsub }) => pubsub.asyncIterator(NEW_TEAM),
                (payload, variables) => {
                    console.log("NEW TEAM SUBSCRIPTION");
                    return (payload.newTeam.subscribers.includes(variables.userId));
                },
            ),
        },
        acceptTeamInvite: {
            subscribe: withFilter(
                (_, __, { pubsub }) => pubsub.asyncIterator(ACCEPT_TEAM_INVITE),
                (payload, variables) => {
                    console.log("ACCEPT TEAM INVITE", payload, variables);
                    return (payload.acceptTeamInvite.subscribers.includes(variables.userId));
                },
            ),
        },
        rejectTeamInvite: {
            subscribe: withFilter(
                (_, __, { pubsub }) => pubsub.asyncIterator(REJECT_TEAM_INVITE),
                (payload, variables) => {
                    return (payload.rejectTeamInvite.subscribers.includes(variables.userId));
                },
            ),
        },
    }

}

export default resolvers