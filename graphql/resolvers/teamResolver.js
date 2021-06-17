import User from '../../models/user.js'
import Team from '../../models/team.js'
import checkAuth from '../../utils/checkAuth.js';
import userResolver from './userResolver.js';


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
                        leader: resolvers.Query.leader(_, { userId: team.leader }),
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
                        leader: resolvers.Query.leader(_, { userId: team.leader }),
                        members: resolvers.Query.members(_, { userIds: team.members })
                    }
                })
            }
            catch (err) {
                throw new Error(err)
            }
        },
        leader: async (_, { userId }) => {
            console.log("leader");
            try {
                const leader = await User.findById(userId)
                return { ...leader._doc }
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
        createNewTeam: async (_, { teamInput: { teamName, leader, members } }, context) => {
            console.log("createNewTeam");
            const user = await checkAuth(context)
            const membersDetails = await User.find({ _id: { $in: members } })
            const leaderDetails = await User.findById(leader)
            try {
                const team = await Team.findOne({ teamName })

                if (team) {
                    throw new Error("Team name already exists. Try new name.")
                }
                const newTeam = new Team({
                    teamName,
                    leader,
                    members,
                    createdBy: user._id
                })
                const result = await newTeam.save()

                const leaderUpdate = await User.findByIdAndUpdate({ _id: leader }, { $set: { unverifiedTeams: [ ...leaderDetails.unverifiedTeams, result._id ] } }, { new: true })

                const update = membersDetails.map(async member => {
                    const membersUpdate = await User.findByIdAndUpdate({ _id: member._id }, { $set: { unverifiedTeams: [ ...member.unverifiedTeams, result._id ] } }, { new: true })
                })

                return {
                    ...result._doc,
                    createdBy: userResolver.Query.userInfo(_, { userId: result.createdBy }),
                    leader: resolvers.Query.leader(_, { userId: result.leader }),
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
                    leader: resolvers.Query.leader(_, { userId: result.leader }),
                    members: resolvers.Query.members(_, { userIds: result.members })
                }
            }
            catch (err) {
                throw new Error(err)
            }
        },
        
    }

}

export default resolvers