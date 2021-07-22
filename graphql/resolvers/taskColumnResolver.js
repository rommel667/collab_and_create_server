import Project from '../../models/project.js'
import checkAuth from '../../utils/checkAuth.js'
import User from '../../models/user.js'
import TaskColumn from '../../models/taskColumn.js'
import Task from '../../models/task.js'
import taskResolver from './taskResolver.js'
import userResolver from './userResolver.js'
import { withFilter } from 'graphql-subscriptions'
import { SET_ASYNC, GET_ASYNC, expiry } from '../../index.js'

const NEW_TASK_COLUMN = "NEW_TASK_COLUMN"
const MOVE_TASK_COLUMN = "MOVE_TASK_COLUMN"
const EDIT_TASK_COLUMN = "EDIT_TASK_COLUMN"
const DELETE_TASK_COLUMN = "DELETE_TASK_COLUMN"

export default {
    Query: {
        taskColumnsByProject: async (_, { taskColumnIds }) => {
            console.log("taskColumnsByProject", taskColumnIds);
            try {
                // const taskColumns = await TaskColumn.find({ _id: { $in: taskColumnIds } })
                // if (!taskColumns) {
                //     throw new Error(`No columns created`)
                // }
                const taskColumns = await Promise.all(taskColumnIds.map(async taskColumnId => {
                    const reply = await GET_ASYNC(`${taskColumnId}`)
                    if (reply) {
                        console.log('using cached data task column');
                        return { ...JSON.parse(reply) }
                    } else {
                        const taskColumnDB = await TaskColumn.findById(taskColumnId)
                        const saveResult = await SET_ASYNC(`${taskColumnId}`, JSON.stringify(taskColumnDB), 'EX', expiry)
                        console.log('new data cached task column');
                        const taskColumnRedis = await GET_ASYNC(`${taskColumnId}`)
                        return { ...JSON.parse(taskColumnRedis) }
                    }
                }))
                return taskColumns.map(taskColumn => {
                    return {
                        ...taskColumn,
                        createdBy: userResolver.Query.userInfo(_, { userId: taskColumn.createdBy }),
                        tasks: taskResolver.Query.tasksByColumn(_, { taskIds: taskColumn.tasks })
                    }
                })
            }
            catch (err) {
                throw new Error(err)
            }
        },
        taskColumnsPersonal: async (_, { taskColumnIds }) => {
            console.log("taskColumnsPersonal");

            try {
                // const taskColumns = await TaskColumn.find({ _id: { $in: taskColumnIds } })
                
                const taskColumns = await Promise.all(taskColumnIds.map(async taskColumnId => {
                    const reply = await GET_ASYNC(`${taskColumnId}`)
                    if (reply) {
                        console.log('using cached data task column');
                        return { ...JSON.parse(reply) }
                    } else {
                        const taskColumnDB = await TaskColumn.findById(taskColumnId)
                        const saveResult = await SET_ASYNC(`${taskColumnId}`, JSON.stringify(taskColumnDB), 'EX', expiry)
                        console.log('new data cached task column');
                        const taskColumnRedis = await GET_ASYNC(`${taskColumnId}`)
                        return { ...JSON.parse(taskColumnRedis) }
                    }
                }))

                return taskColumns.map(taskColumn => {
                    return {
                        ...taskColumn,
                        tasks: taskResolver.Query.tasksByColumnPersonal(_, { taskIds: taskColumn.tasks })
                    }
                })
            }
            catch (err) {
                throw new Error(err)
            }
        },
    },

    Mutation: {
        newTaskColumn: async (_, { columnName, projectId }, context) => {
            console.log("newTaskColumn");
            const user = await checkAuth(context)
            try {
                const project = await Project.findById(projectId)

                const autoSequence = await project.taskColumns.length + 1
                const newTaskColumn = new TaskColumn({
                    columnName, projectId, sequence: autoSequence, createdBy: user._id
                })
                const result = await newTaskColumn.save()
                const projectTaskColumnUpdate = await Project.findByIdAndUpdate({ _id: projectId }, { $set: { taskColumns: [...project.taskColumns, result._id] } }, { new: true })
                
                await context.pubsub.publish(NEW_TASK_COLUMN, {
                    newTaskColumn: {
                        ...result._doc,
                        createdBy: user,
                        tasks: [],
                        subscribers: project.confirmedMembers.filter(id => id != user._id),
                    }
                })
                
                return {
                    ...result._doc,
                    createdBy: userResolver.Query.userInfo(_, { userId: result.createdBy }),
                    tasks: taskResolver.Query.tasksByColumn(_, { taskIds: result.tasks })
                }

            }
            catch (err) {
                throw new Error(err)
            }
        },
        editTaskColumn: async (_, { columnId, columnName, projectId }, context) => {
            console.log("editTaskColumn");
            const user = await checkAuth(context)
            try {

                const project = await Project.findById(projectId)
                const result = await TaskColumn.findByIdAndUpdate({ _id: columnId }, { $set: { columnName } }, { new: true })
                
                await context.pubsub.publish(EDIT_TASK_COLUMN, {
                    editTaskColumn: {
                        ...result._doc,
                        subscribers: project.confirmedMembers.filter(id => id != user._id),
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
        deleteTaskColumn: async (_, { columnId, projectId }, context) => {
            console.log("deleteTaskColumn");
            const user = await checkAuth(context)
            try {
                const project = await Project.findById(projectId)
                const taskColumn = await TaskColumn.findById(columnId)

                await Project.findByIdAndUpdate({ _id: projectId }, { $set: { taskColumns: project.taskColumns.filter(col => col != columnId) } }, { new: true })

                await taskColumn.tasks.map(async taskId => {
                    await Task.findByIdAndDelete(taskId)
                })

                const result = await TaskColumn.findByIdAndDelete(columnId)
                
                await context.pubsub.publish(DELETE_TASK_COLUMN, {
                    deleteTaskColumn: {
                        ...result._doc,
                        subscribers: project.confirmedMembers.filter(id => id != user._id),
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
        moveTaskColumn: async (_, { taskColumnIds, projectId }, context) => {
            console.log("moveTaskColumn");
            const user = await checkAuth(context)
            try {
                
                const project = await Project.findById(projectId)
                
                const newTaskColumns = await taskColumnIds.map(async (columnId, index) => {
                    await TaskColumn.findByIdAndUpdate({ _id: columnId}, { $set: { sequence: index + 1 } }, { new: true })
                })

                await context.pubsub.publish(MOVE_TASK_COLUMN, {
                    moveTaskColumn: {
                        newSequenceIds: taskColumnIds,
                        confirmedMembers: project.confirmedMembers.filter(id => id != user._id),
                        projectId
                    }
                })

                return {
                    newSequenceIds: taskColumnIds,
                    projectId
                }

            }
            catch (err) {
                throw new Error(err)
            }
        },
        initialTaskColumnPersonal: async (_, { columnName, sequence, createdBy }) => {
            console.log("newTaskColumnPersonal");
            try {
                const newTaskColumn = new TaskColumn({
                    columnName, sequence, createdBy
                })
                const result = await newTaskColumn.save()

                return {
                    ...result._doc,
                }
            }
            catch (err) {
                throw new Error(err)
            }
        },
        
        newTaskColumnPersonal: async (_, { columnName }, context) => {
            console.log("newTaskColumnPersonal");
            const user = await checkAuth(context)
            try {

                const userDetails = await User.findById(user._id)
                
                const autoSequence = await userDetails.personalTaskColumns.length + 1
                const newTaskColumn = new TaskColumn({
                    columnName, sequence: autoSequence
                })
                const result = await newTaskColumn.save()

                const userUpdate = await User.findByIdAndUpdate({ _id: user._id}, { $set: {
                    personalTaskColumns: [ result._id, ...userDetails.personalTaskColumns ]
                } }, { new: true })
                
                return {
                    ...result._doc,
                    tasks: taskResolver.Query.tasksByColumn(_, { taskIds: result.tasks })
                }
            }
            catch (err) {
                throw new Error(err)
            }
        },
        editTaskColumnPersonal: async (_, { columnId, columnName }) => {
            console.log("editTaskColumnPersonal");
            try {

                const result = await TaskColumn.findByIdAndUpdate({ _id: columnId}, { $set: { columnName } }, { new: true })
                
                return {
                    ...result._doc,
                }
            }
            catch (err) {
                throw new Error(err)
            }
        },
        deleteTaskColumnPersonal: async (_, { columnId }, context) => {
            console.log("deleteTaskColumnPersonal");
            const user = await checkAuth(context)
            try {

                const userDetails = await User.findById(user._id)

                const userUpdate = await User.findByIdAndUpdate({ _id: user._id}, { $set: {
                    personalTaskColumns: [ ...userDetails.personalTaskColumns.filter(column => column != columnId) ]
                } }, { new: true })

                const taskColumnDetails = await TaskColumn.findById(columnId)

                await taskColumnDetails.tasks.map(async task => {
                    await Task.findByIdAndDelete(task)
                })

                const result = await TaskColumn.findByIdAndDelete(columnId)
                
                return {
                    ...result._doc,
                }
            }
            catch (err) {
                throw new Error(err)
            }
        },
        moveTaskColumnPersonal: async (_, { taskColumnIds }, context) => {
            console.log("moveTaskColumnPersonal", taskColumnIds);
            const user = await checkAuth(context)
            try {
                
                const userDetails = await User.findById(user._id)
                
                const newTaskColumns =  await Promise.all(taskColumnIds.map(async (columnId, index) => {
                    const update = await TaskColumn.findByIdAndUpdate({ _id: columnId}, { $set: { sequence: index + 1 } }, { new: true })
                    return update._doc
                }))


                console.log("NEW TASK COLUMNS",newTaskColumns);

                return {
                    newSequenceIds: taskColumnIds,
                }

            }
            catch (err) {
                throw new Error(err)
            }
        },

    },
    Subscription: {
        newTaskColumn: {
            subscribe: withFilter(
                (_, __, { pubsub }) => pubsub.asyncIterator(NEW_TASK_COLUMN),
                (payload, variables) => {
                    console.log("newTaskColumnSubscription");
                    return (payload.newTaskColumn.subscribers.includes(variables.userId));
                },
            ),
        },
        editTaskColumn: {
            subscribe: withFilter(
                (_, __, { pubsub }) => pubsub.asyncIterator(EDIT_TASK_COLUMN),
                (payload, variables) => {
                    console.log("editTaskColumnSubscription");
                    return (payload.editTaskColumn.subscribers.includes(variables.userId));
                },
            ),
        },
        deleteTaskColumn: {
            subscribe: withFilter(
                (_, __, { pubsub }) => pubsub.asyncIterator(DELETE_TASK_COLUMN),
                (payload, variables) => {
                    console.log("deleteTaskColumnSubscription");
                    return (payload.deleteTaskColumn.subscribers.includes(variables.userId));
                },
            ),
        },
        moveTaskColumn: {
            subscribe: withFilter(
                (_, __, { pubsub }) => pubsub.asyncIterator(MOVE_TASK_COLUMN),
                (payload, variables) => {
                    console.log("moveTaskColumnSubscription");
                    return (payload.moveTaskColumn.confirmedMembers.includes(variables.userId));
                },
            ),
        },
        

    }

}