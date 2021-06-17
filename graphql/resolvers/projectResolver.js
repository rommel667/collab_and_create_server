import Project from '../../models/project.js'
import User from '../../models/user.js'
import checkAuth from '../../utils/checkAuth.js'
import userResolver from './userResolver.js'
import taskColumnResolver from './taskColumnResolver.js'
import noteCategoryResolver from './noteCategoryResolver.js'
import { withFilter } from 'graphql-subscriptions'



const NEW_PROJECT = 'NEW_PROJECT'

export default {
    Query: {
        projectsByUser: async (_, __, context) => {
            console.log("projects");
            const user = await checkAuth(context)
            try {
                const projects = await Project.find({ confirmedMembers: user._id })
                if (!projects) {
                    throw new Error(`No projects created`)
                }
                return projects.map(project => {
                    return {
                        ...project._doc,
                        createdBy: userResolver.Query.userInfo(_, { userId: project.createdBy }),
                        confirmedMembers: userResolver.Query.usersInfo(_, { userIds: project.confirmedMembers }),
                        unconfirmMembers: userResolver.Query.usersInfo(_, { userIds: project.unconfirmMembers }),
                        createdAt: project.createdAt.toISOString(),
                        updatedAt: project.updatedAt.toISOString(),
                        taskColumns: taskColumnResolver.Query.taskColumnsByProject(_, { taskColumnIds: project.taskColumns }),
                        noteCategories: noteCategoryResolver.Query.noteCategoriesByProject(_, { noteCategoryIds: project.noteCategories })
                    }
                })
            }
            catch (err) {
                throw new Error(err)
            }
        },
        projectInfo: async (_, { projectId }) => {
            console.log("projectInfo");
            
            try {
                const project = await Project.findById(projectId)
                if (!project) {
                    throw new Error(`Project not found`)
                }

                return {
                    ...project._doc,
                    createdBy: userResolver.Query.userInfo(_, { userId: project.createdBy }),
                    confirmedMembers: userResolver.Query.usersInfo(_, { userIds: project.confirmedMembers }),
                    unconfirmMembers: userResolver.Query.usersInfo(_, { userIds: project.unconfirmMembers }),
                    createdAt: project.createdAt.toISOString(),
                    updatedAt: project.updatedAt.toISOString(),
                    taskColumns: taskColumnResolver.Query.taskColumnsByProject(_, { taskColumnIds: project.taskColumns }),
                    noteCategories: noteCategoryResolver.Query.noteCategoriesByProject(_, { noteCategoryIds: project.noteCategories })
                }

            }
            catch (err) {
                throw new Error(err)
            }
        },
        unconfirmProjectInvites: async (_, __, context) => {
            console.log("projects");
            const user = await checkAuth(context)
            try {
                const projects = await Project.find({ unconfirmMembers: user._id })
                if (!projects) {
                    throw new Error(`Error fetching project invites`)
                }
                return projects.map(project => {
                    return {
                        ...project._doc,
                        createdBy: userResolver.Query.userInfo(_, { userId: project.createdBy }),
                        confirmedMembers: userResolver.Query.usersInfo(_, { userIds: project.confirmedMembers }),
                        unconfirmMembers: userResolver.Query.usersInfo(_, { userIds: project.unconfirmMembers }),
                        createdAt: project.createdAt.toISOString(),
                        updatedAt: project.updatedAt.toISOString(),
                        taskColumns: taskColumnResolver.Query.taskColumnsByProject(_, { taskColumnIds: project.taskColumns })
                    }
                })
            }
            catch (err) {
                throw new Error(err)
            }
        },
    },

    Mutation: {
        newProject: async (_, { projectInput: { projectName, description, icon, techStacks, unconfirmMembers } }, context) => {
            console.log("newProject");
            const user = await checkAuth(context)
            try {
                const newProject = new Project({
                    projectName, description, icon, status: "Ongoing",
                    techStacks, createdBy: user._id,
                    confirmedMembers: [user._id],
                    unconfirmMembers
                })
                const result = await newProject.save()

                context.pubsub.publish(NEW_PROJECT, {
                    newProject: {
                        ...result._doc,
                        createdBy: user,
                        unconfirmMembers: unconfirmMembers,
                    }
                })
                return {
                    ...result._doc,
                    createdBy: userResolver.Query.userInfo(_, { userId: result.createdBy }),
                    unconfirmMembers: userResolver.Query.usersInfo(_, { userIds: result.unconfirmMembers }),
                    confirmedMembers: userResolver.Query.usersInfo(_, { userIds: result.confirmedMembers }),
                }
            }
            catch (err) {
                throw new Error(err)
            }
        },
        acceptProjectInvite: async (_, { projectId }, context) => {
            console.log("confirmProjectInvite", projectId);
            const user = await checkAuth(context)
            try {
                const project = await Project.findById(projectId)
                if (!project) {
                    throw new Error("Project not found")
                }
                const result = await Project.findByIdAndUpdate(
                    { _id: projectId },
                    {
                        $set:
                        {
                            unconfirmMembers: project.unconfirmMembers.filter(id => id != user._id),
                            confirmedMembers: [...project.confirmedMembers, user._id]
                        },
                    },

                    { new: true }
                )


                return {
                    ...result._doc,
                    createdBy: userResolver.Query.userInfo(_, { userId: result.createdBy }),
                    unconfirmMembers: userResolver.Query.usersInfo(_, { userIds: result.unconfirmMembers }),
                    confirmedMembers: userResolver.Query.usersInfo(_, { userIds: result.confirmedMembers }),
                }
            }
            catch (err) {
                throw new Error(err)
            }
        },
        rejectProjectInvite: async (_, { projectId }, context) => {
            console.log("rejectProjectInvite");
            const user = await checkAuth(context)
            try {
                const project = await Project.findById(projectId)
                if (!project) {
                    throw new Error("Project not found")
                }
                const result = await Project.findByIdAndUpdate(
                    { _id: projectId },
                    {
                        $set:
                        {
                            unconfirmMembers: project.unconfirmMembers.filter(id => id != user._id),
                            rejectedInviteMembers: [...project.rejectedInviteMembers, user._id]
                        },
                    },

                    { new: true }
                )


                return {
                    ...result._doc,
                    createdBy: userResolver.Query.userInfo(_, { userId: result.createdBy }),
                    unconfirmMembers: userResolver.Query.usersInfo(_, { userIds: result.unconfirmMembers }),
                    confirmedMembers: userResolver.Query.usersInfo(_, { userIds: result.confirmedMembers }),
                }
            }
            catch (err) {
                throw new Error(err)
            }
        },
    },

    Subscription: {
        // newProject: {
        //     subscribe: (_, __, { pubsub }) => pubsub.asyncIterator(NEW_PROJECT)
        // },
        newProject: {
            subscribe: withFilter(
                (_, __, { pubsub }) => pubsub.asyncIterator(NEW_PROJECT),
                (payload, variables) => {
                    return (payload.newProject.unconfirmMembers.includes(variables.userId));
                },
            ),
        },


    }

}