import User from '../../models/user.js'
import Team from '../../models/team.js'
import checkAuth from '../../utils/checkAuth.js';
import userResolver from './userResolver.js';
import { withFilter } from 'graphql-subscriptions'

const NEW_TEAM = "NEW_TEAM"

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
                        members: resolvers.Query.members(_, { userIds: team.members })
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
                        members: resolvers.Query.members(_, { userIds: team.members })
                    }
                })
            }
            catch (err) {
                throw new Error(err)
            }
        },
        members: async (_, { userIds }) => {
            console.log("members");

            try {
                const members = await User.find({ _id: { $in: userIds } })
                return members.map(member => {
                    return { ...member._doc }
                })
            }
            catch (err) {
                throw new Error(err)
            }
        },
    },
    Mutation: {
        newTeam: async (_, { teamName, members }, context) => {
            console.log("newTeam");
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
                    members: [ user._id, ...members ],
                    createdBy: user._id
                })
                const result = await newTeam.save()

                const creatorUpdate = await User.findByIdAndUpdate({ _id: user._id }, { $set: { verifiedTeams: [ userDetails.verifiedTeams, result._id ] } }, { new: true })

                const update = membersDetails.map(async member => {
                    const membersUpdate = await User.findByIdAndUpdate({ _id: member._id }, { $set: { unverifiedTeams: [ ...member.unverifiedTeams, result._id ] } }, { new: true })
                })

                await context.pubsub.publish(NEW_TEAM, {
                    newTeam: {
                        ...result._doc,
                        subscribers: [ ...members ]
                    }
                })

                return {
                    ...result._doc,
                    createdBy: userResolver.Query.userInfo(_, { userId: result.createdBy }),
                    members: resolvers.Query.members(_, { userIds: result.members })
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
                
                const result = await Team.findByIdAndUpdate({ _id: teamId }, { $set: { members: [ ...team.members, newMemberId ] } }, { new: true })


                if (!result) {
                    throw new Error(`Problem updating team`)
                }

                return {
                    ...result._doc,
                    createdBy: userResolver.Query.userInfo(_, { userId: result.createdBy }),
                    members: resolvers.Query.members(_, { userIds: result.members })
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
                    return (payload.newTeam.subscribers.includes(variables.userId));
                },
            ),
        },
    }

}

export default resolvers