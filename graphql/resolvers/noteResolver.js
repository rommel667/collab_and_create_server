import Note from '../../models/note.js'
import NoteCategory from '../../models/noteCategory.js'
import Project from '../../models/project.js'
import userResolver from './userResolver.js'
import checkAuth from '../../utils/checkAuth.js'
import { withFilter } from 'graphql-subscriptions'


const NEW_NOTE = "NEW_NOTE"
const MOVE_NOTE = "MOVE_NOTE"

const resolver = {
    Query: {
        notesByProject: async (_, { noteCategoryIds }) => {
            console.log("notesByProject");
            try {
                const notes = await Note.find({ categoryId: { $in: noteCategoryIds } })
                if (!filteredNotes) {
                    throw new Error(`No notes added on this category`)
                }
                return filteredNotes.map(note => {
                    return {
                        ...note._doc,
                        createdBy: userResolver.Query.userInfo(_, { userId: note.createdBy }),
                    }
                })
            }
            catch (err) {
                throw new Error(err)
            }
        },
        notesByCategory: async (_, { noteIds }) => {
            console.log("notesByCategory");
            try {
                const notes = await Note.find({ _id: { $in: noteIds } })
                if (!notes) {
                    throw new Error(`No notes added on this category`)
                }
                return notes.map(note => {
                    return {
                        ...note._doc,
                        createdBy: userResolver.Query.userInfo(_, { userId: note.createdBy }),
                    }
                })
            }
            catch (err) {
                throw new Error(err)
            }
        },
    },

    Mutation: {
        newNote: async (_, { description, categoryId, projectId }, context) => {
            console.log("newNote");
            const user = await checkAuth(context)

            try {
                const noteCategory = await NoteCategory.findById(categoryId)

                //find project to get confirmed members for subscription
                const project = await Project.findById(projectId)
                const newNote = new Note({
                    description,
                    categoryId,
                    projectId,
                    createdBy: user._id
                })

                const result = await newNote.save()

                await context.pubsub.publish(NEW_NOTE, {
                    newNote: {
                        ...result._doc,
                        createdBy: user,
                        confirmedMembers: project.confirmedMembers.filter(id => id != user._id),
                    }
                })

                await NoteCategory.findByIdAndUpdate(categoryId, { $set: { notes: [...noteCategory.notes, result._id] } }, { new: true })
                return {
                    ...result._doc,
                    createdBy: userResolver.Query.userInfo(_, { userId: result.createdBy }),
                }
            }
            catch (err) {
                throw new Error(err)
            }
        },
        // moveNote: async (_, { sourceColumnId, destinationColumnId, taskId, projectId }, context) => {
        //     console.log("moveTask");
        //     const user = await checkAuth(context)
        //     try {
                
        //         const project = await Project.findById(projectId)

        //         const sourceColumn = await TaskColumn.findById(sourceColumnId)
        //         const destinationColumn = await TaskColumn.findById(destinationColumnId)

        //         const updatedSourceColumn = await TaskColumn.findByIdAndUpdate(
        //             sourceColumnId, { $set: { tasks: [...sourceColumn.tasks.filter(id => id != taskId)] } }, { new: true }
        //         )
        //         const updatedDestinationColumn = await TaskColumn.findByIdAndUpdate(
        //             destinationColumnId, { $set: { tasks: [...destinationColumn.tasks, taskId] } }, { new: true }
        //         )

        //         await context.pubsub.publish(MOVE_TASK, {
        //             moveTask: {
        //                 message: "Update successful",
        //                 sourceColumnId, destinationColumnId, taskId,
        //                 confirmedMembers: project.confirmedMembers.filter(id => id != user._id),
        //                 projectId
        //             }
        //         })


        //         if (updatedSourceColumn && updatedDestinationColumn) {
        //             return { message: "Update successful", sourceColumnId, destinationColumnId, taskId }
        //         } else {
        //             return { message: "Update failed" }
        //         }

        //     }
        //     catch (err) {
        //         throw new Error(err)
        //     }
        // },
        
    },
    Subscription: {
        newNote: {
            subscribe: withFilter(
                (_, __, { pubsub }) => pubsub.asyncIterator(NEW_NOTE),
                (payload, variables) => {
                    return (payload.newNote.confirmedMembers.includes(variables.userId));
                },
            ),
        },
        // moveTask: {
        //     subscribe: withFilter(
        //         (_, __, { pubsub }) => pubsub.asyncIterator(MOVE_TASK),
        //         (payload, variables) => {
        //             return (payload.moveTask.confirmedMembers.includes(variables.userId));
        //         },
        //     ),
        // },


    }
    
}


export default resolver