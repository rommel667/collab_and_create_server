import Project from '../../models/project.js'
import checkAuth from '../../utils/checkAuth.js'
import TaskColumn from '../../models/taskColumn.js'
import taskResolver from './taskResolver.js'
import userResolver from './userResolver.js'
import { withFilter } from 'graphql-subscriptions'

const MOVE_TASK_COLUMN = "MOVE_TASK_COLUMN"

export default {
    Query: {
        taskColumnsByProject: async (_, { taskColumnIds }) => {
            console.log("taskColumnsByProject", taskColumnIds);

            try {
                const taskColumns = await TaskColumn.find({ _id: { $in: taskColumnIds } })
                if (!taskColumns) {
                    throw new Error(`No columns created`)
                }
                return taskColumns.map(taskColumn => {
                    return {
                        ...taskColumn._doc,
                        createdBy: userResolver.Query.userInfo(_, { userId: taskColumn.createdBy }),
                        tasks: taskResolver.Query.tasksByColumn(_, { taskIds: taskColumn.tasks })
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
        initialTaskColumnPersonal: async (_, { columnName, sequence}) => {
            console.log("newTaskColumnPersonal");
            try {
                const newTaskColumn = new TaskColumn({
                    columnName, sequence
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
        moveTaskColumn: async (_, { taskColumnIds, projectId }, context) => {
            console.log("moveTaskColumn");
            const user = await checkAuth(context)
            try {
                
                const project = await Project.findById(projectId)
                console.log("taskColumnIds",taskColumnIds);
                console.log("project",project);
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

    },
    Subscription: {
        moveTaskColumn: {
            subscribe: withFilter(
                (_, __, { pubsub }) => pubsub.asyncIterator(MOVE_TASK_COLUMN),
                (payload, variables) => {
                    return (payload.moveTaskColumn.confirmedMembers.includes(variables.userId));
                },
            ),
        },
        

    }

}