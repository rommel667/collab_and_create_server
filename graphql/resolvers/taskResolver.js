import Task from '../../models/task.js'
import TaskColumn from '../../models/taskColumn.js'
import Project from '../../models/project.js'
import User from '../../models/user.js'
import checkAuth from '../../utils/checkAuth.js'
import userResolver from './userResolver.js'
import { withFilter } from 'graphql-subscriptions'
import { SET_ASYNC, GET_ASYNC, DEL_ASYNC, expiry } from '../../index.js'



const NEW_TASK = "NEW_TASK"
const MOVE_TASK = "MOVE_TASK"
const EDIT_TASK = "EDIT_TASK"
const DELETE_TASK = "DELETE_TASK"


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
                const tasks = await Promise.all(taskIds.map(async (taskId, index) => {
                    const reply = await GET_ASYNC(`${taskId}`)
                    if (reply) {
                        console.log('using cached data task project');
                        return { ...JSON.parse(reply) }
                    } else {
                        const taskDB = await Task.findById(taskId)
                        const saveResult = await SET_ASYNC(`${taskId}`, JSON.stringify(taskDB), 'EX', expiry)
                        console.log('new data cached task project');
                        const taskRedis = await GET_ASYNC(`${taskId}`)
                        return { ...JSON.parse(taskRedis) }
                    }
                }))
                return tasks.map(task => {
                    return {
                        ...task,
                        createdAt: new Date(task.createdAt).toISOString(),
                        updatedAt: new Date(task.updatedAt).toISOString(),
                        createdBy: userResolver.Query.userInfo(_, { userId: task.createdBy }),
                        inCharge: userResolver.Query.usersInfo(_, { userIds: task.inCharge }),
                    }
                })
            }
            catch (err) {
                throw new Error(err)
            }
        },
        tasksByColumnPersonal: async (_, { taskIds }) => {
            console.log("tasksByColumnPersonal");
            try {
                // const tasks = await Task.find({ _id: { $in: taskIds } })
                // if (!tasks) {
                //     throw new Error(`Tasks not found`)
                // }
                const tasks = await Promise.all(taskIds.map(async (taskId, index) => {
                    const reply = await GET_ASYNC(`${taskId}`)
                    if (reply) {
                        console.log('using cached data task personal');
                        return { ...JSON.parse(reply) }
                    } else {
                        const taskDB = await Task.findById(taskId)
                        const saveResult = await SET_ASYNC(`${taskId}`, JSON.stringify(taskDB), 'EX', expiry)
                        console.log('new data cached task personal');
                        const taskRedis = await GET_ASYNC(`${taskId}`)
                        return { ...JSON.parse(taskRedis) }
                    }
                }))
                return tasks.map(task => {
                    return {
                        ...task,
                        createdAt: new Date(task.createdAt).toISOString(),
                        updatedAt: new Date(task.updatedAt).toISOString(),
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
                        createdAt: new Date(result.createdAt).toISOString(),
                        updatedAt: new Date(result.updatedAt).toISOString(),
                        confirmedMembers: project.confirmedMembers.filter(id => id != user._id),
                    }
                })

                await TaskColumn.findByIdAndUpdate(columnId, { $set: { tasks: [...taskColumn.tasks, result._id] } }, { new: true })
                return {
                    ...result._doc,
                    createdBy: userResolver.Query.userInfo(_, { userId: result.createdBy }),
                    inCharge: userResolver.Query.usersInfo(_, { userIds: result.inCharge }),
                    createdAt: new Date(result.createdAt).toISOString(),
                    updatedAt: new Date(result.updatedAt).toISOString(),
                }
            }
            catch (err) {
                throw new Error(err)
            }
        },
        editTask: async (_, { taskId, description, inCharge, projectId }, context) => {
            console.log("editTask");
            const user = await checkAuth(context)

            try {

                const project = await Project.findById(projectId)

                const inChargeUsers = await User.find({ _id: { $in: inCharge } })

                const result = await Task.findByIdAndUpdate(taskId, { $set: { description, inCharge } }, { new: true })


                await context.pubsub.publish(EDIT_TASK, {
                    editTask: {
                        ...result._doc,
                        inCharge: inChargeUsers,
                        confirmedMembers: project.confirmedMembers.filter(id => id != user._id),
                    }
                })

                return {
                    ...result._doc,
                    inCharge: userResolver.Query.usersInfo(_, { userIds: result.inCharge }),
                }
            }
            catch (err) {
                throw new Error(err)
            }
        },
        deleteTask: async (_, { taskId, columnId, projectId }, context) => {
            console.log("deleteTask");
            const user = await checkAuth(context)

            try {

                const project = await Project.findById(projectId)

                const taskColumn = await TaskColumn.findById(columnId)

                await TaskColumn.findByIdAndUpdate(columnId, { $set: { tasks: [...taskColumn.tasks.filter(task => task != taskId)] } }, { new: true })

                const result = await Task.findByIdAndDelete(taskId)

                await context.pubsub.publish(DELETE_TASK, {
                    deleteTask: {
                        ...result._doc,
                        confirmedMembers: project.confirmedMembers.filter(id => id != user._id),
                    }
                })

                return {
                    ...result._doc,
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

                const updatedTask = await Task.findByIdAndUpdate(
                    taskId, { $set: { columnId: destinationColumnId } }, { new: true }
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
                    return { message: "Update successful", sourceColumnId, destinationColumnId, taskId, projectId }
                } else {
                    return { message: "Update failed" }
                }

            }
            catch (err) {
                throw new Error(err)
            }
        },
        newTaskPersonal: async (_, { description, columnId }) => {
            console.log("newTaskPersonal");
            try {
                const taskColumn = await TaskColumn.findById(columnId)

                const newTask = new Task({
                    description,
                    columnId,
                })

                const result = await newTask.save()

                await TaskColumn.findByIdAndUpdate(columnId, { $set: { tasks: [...taskColumn.tasks, result._id] } }, { new: true })

                return {
                    ...result._doc,
                    createdAt: new Date(result.createdAt).toISOString(),
                    updatedAt: new Date(result.updatedAt).toISOString(),
                }
            }
            catch (err) {
                throw new Error(err)
            }
        },
        editTaskPersonal: async (_, { taskId, description }) => {
            console.log("editTaskPersonal");
            try {

                const result = await Task.findByIdAndUpdate(taskId, { $set: { description } }, { new: true })
                const saveResult = await SET_ASYNC(`${taskId}`, JSON.stringify(result), 'EX', 100)
                return {
                    ...result._doc,
                }
            }
            catch (err) {
                throw new Error(err)
            }
        },
        deleteTaskPersonal: async (_, { taskId, columnId }, context) => {
            console.log("deleteTaskPersonal");
            const user = await checkAuth(context)
            try {

                const taskColumn = await TaskColumn.findById(columnId)

                await TaskColumn.findByIdAndUpdate(columnId, {
                    $set: {
                        tasks: [
                            ...taskColumn.tasks.filter(task => task != taskId)
                        ]
                    }
                }, { new: true })

                const result = await Task.findByIdAndDelete(taskId)

                return {
                    ...result._doc,
                }
            }
            catch (err) {
                throw new Error(err)
            }
        },
        moveTaskPersonal: async (_, { sourceColumnId, destinationColumnId, taskId }, context) => {
            console.log("moveTaskPersonal");
            const user = await checkAuth(context)
            try {

                const sourceColumn = await TaskColumn.findById(sourceColumnId)
                const destinationColumn = await TaskColumn.findById(destinationColumnId)

                const updatedSourceColumn = await TaskColumn.findByIdAndUpdate(
                    sourceColumnId, { $set: { tasks: [...sourceColumn.tasks.filter(id => id != taskId)] } }, { new: true }
                )
                const updatedDestinationColumn = await TaskColumn.findByIdAndUpdate(
                    destinationColumnId, { $set: { tasks: [...destinationColumn.tasks, taskId] } }, { new: true }
                )

                const updatedTask = await Task.findByIdAndUpdate(
                    taskId, { $set: { columnId: destinationColumnId } }, { new: true }
                )


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
                    console.log("newTaskSubscription");
                    return (payload.newTask.confirmedMembers.includes(variables.userId));
                },
            ),
        },
        editTask: {
            subscribe: withFilter(
                (_, __, { pubsub }) => pubsub.asyncIterator(EDIT_TASK),
                (payload, variables) => {
                    console.log("editTaskSubscription");
                    return (payload.editTask.confirmedMembers.includes(variables.userId));
                },
            ),
        },
        deleteTask: {
            subscribe: withFilter(
                (_, __, { pubsub }) => pubsub.asyncIterator(DELETE_TASK),
                (payload, variables) => {
                    console.log("deleteTaskSubscription");
                    return (payload.deleteTask.confirmedMembers.includes(variables.userId));
                },
            ),
        },
        moveTask: {
            subscribe: withFilter(
                (_, __, { pubsub }) => pubsub.asyncIterator(MOVE_TASK),
                (payload, variables) => {
                    console.log("moveTaskSubscription");
                    return (payload.moveTask.confirmedMembers.includes(variables.userId));
                },
            ),
        },


    }
}


export default resolver