import Task from '../../models/task.js'
import TaskColumn from '../../models/taskColumn.js'
import Project from '../../models/project.js'
import User from '../../models/user.js'
import checkAuth from '../../utils/checkAuth.js'
import userResolver from './userResolver.js'
import { withFilter } from 'graphql-subscriptions'


const NEW_TASK = "NEW_TASK"
const MOVE_TASK = "MOVE_TASK"

const resolver = {
    Query: {
        tasksByProject: async (_, { taskColumnIds }) => {
            console.log("tasksByProject");
            try {
                const tasks = await Task.find({ columnId: { $in: taskColumnIds } })
                if (!tasks) {
                    throw new Error(`No task added on this column`)
                }
                return tasks.map(task => {
                    return {
                        ...task._doc,
                        createdBy: userResolver.Query.userInfo(_, { userId: task.createdBy }),
                        inCharge: userResolver.Query.usersInfo(_, { userIds: task.inCharge }),
                    }
                })
            }
            catch (err) {
                throw new Error(err)
            }
        },
        tasksByColumn: async (_, { taskIds }) => {
            console.log("tasksByColumns");
            try {
                const tasks = await Task.find({ _id: { $in: taskIds } })
                if (!tasks) {
                    throw new Error(`No task added on this column`)
                }
                return tasks.map(task => {
                    return {
                        ...task._doc,
                        createdBy: userResolver.Query.userInfo(_, { userId: task.createdBy }),
                        inCharge: userResolver.Query.usersInfo(_, { userIds: task.inCharge }),
                    }
                })
            }
            catch (err) {
                throw new Error(err)
            }
        },
    },

    Mutation: {
        newTask: async (_, { description, inCharge, columnId, projectId }, context) => {
            console.log("newTask");
            const user = await checkAuth(context)

            try {
                const taskColumn = await TaskColumn.findById(columnId)

                //find project to get confirmed members for subscription
                const project = await Project.findById(projectId)

                const inChargeUsers = await User.find({ _id: { $in: inCharge } })

                const newTask = new Task({
                    description,
                    inCharge,
                    columnId,
                    projectId,
                    createdBy: user._id
                })

                const result = await newTask.save()

                await context.pubsub.publish(NEW_TASK, {
                    newTask: {
                        ...result._doc,
                        createdBy: user,
                        inCharge: inChargeUsers,
                        confirmedMembers: project.confirmedMembers.filter(id => id != user._id),
                    }
                })

                await TaskColumn.findByIdAndUpdate(columnId, { $set: { tasks: [...taskColumn.tasks, result._id] } }, { new: true })
                return {
                    ...result._doc,
                    createdBy: userResolver.Query.userInfo(_, { userId: result.createdBy }),
                    inCharge: userResolver.Query.usersInfo(_, { userIds: result.inCharge }),
                }
            }
            catch (err) {
                throw new Error(err)
            }
        },
        moveTask: async (_, { sourceColumnId, destinationColumnId, taskId, projectId }, context) => {
            console.log("moveTask");
            const user = await checkAuth(context)
            try {
                //find project to get confirmed members for subscription
                // const project = await Project.find({ taskColumns: { "$in": [sourceColumnId] } })
                const project = await Project.findById(projectId)

                const sourceColumn = await TaskColumn.findById(sourceColumnId)
                const destinationColumn = await TaskColumn.findById(destinationColumnId)

                const updatedSourceColumn = await TaskColumn.findByIdAndUpdate(
                    sourceColumnId, { $set: { tasks: [...sourceColumn.tasks.filter(id => id != taskId)] } }, { new: true }
                )
                const updatedDestinationColumn = await TaskColumn.findByIdAndUpdate(
                    destinationColumnId, { $set: { tasks: [...destinationColumn.tasks, taskId] } }, { new: true }
                )

                await context.pubsub.publish(MOVE_TASK, {
                    moveTask: {
                        message: "Update successful",
                        sourceColumnId, destinationColumnId, taskId,
                        confirmedMembers: project.confirmedMembers.filter(id => id != user._id),
                        projectId
                    }
                })


                if (updatedSourceColumn && updatedDestinationColumn) {
                    return { message: "Update successful", sourceColumnId, destinationColumnId, taskId }
                } else {
                    return { message: "Update failed" }
                }

            }
            catch (err) {
                throw new Error(err)
            }
        },
    },
    Subscription: {
        newTask: {
            subscribe: withFilter(
                (_, __, { pubsub }) => pubsub.asyncIterator(NEW_TASK),
                (payload, variables) => {
                    return (payload.newTask.confirmedMembers.includes(variables.userId));
                },
            ),
        },
        moveTask: {
            subscribe: withFilter(
                (_, __, { pubsub }) => pubsub.asyncIterator(MOVE_TASK),
                (payload, variables) => {
                    return (payload.moveTask.confirmedMembers.includes(variables.userId));
                },
            ),
        },


    }
}


export default resolver