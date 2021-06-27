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
        newNotePersonal: async (_, { description, categoryId }, context) => {
            console.log("newNotePersonal");
            const user = await checkAuth(context)
            try {
                const noteCategory = await NoteCategory.findById(categoryId)
              
                const newNote = new Note({
                    description,
                    categoryId,
                    createdBy: user._id
                })

                const result = await newNote.save()

                await NoteCategory.findByIdAndUpdate(categoryId, { $set: { notes: [...noteCategory.notes, result._id] } }, { new: true })
                return {
                    ...result._doc,
                }
            }
            catch (err) {
                throw new Error(err)
            }
        },
        newNote: async (_, { description, categoryId, projectId }, context) => {
            console.log("newNote");
            const user = await checkAuth(context)

            try {
                const noteCategory = await NoteCategory.findById(categoryId)
                console.log("NOTE", noteCategory);
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
        moveNote: async (_, { sourceCategoryId, destinationCategoryId, noteId, projectId }, context) => {
            console.log("moveNote");
            const user = await checkAuth(context)
            try {
                
                const project = await Project.findById(projectId)

                const sourceCategory = await NoteCategory.findById(sourceCategoryId)
                const destinationCategory = await NoteCategory.findById(destinationCategoryId)

                const updatedSourceCategory = await NoteCategory.findByIdAndUpdate(
                    sourceCategoryId, { $set: { notes: [...sourceCategory.notes.filter(id => id != noteId)] } }, { new: true }
                )
                const updatedDestinationCategory = await NoteCategory.findByIdAndUpdate(
                    destinationCategoryId, { $set: { notes: [...destinationCategory.notes, noteId] } }, { new: true }
                )

                await context.pubsub.publish(MOVE_NOTE, {
                    moveNote: {
                        message: "Update successful",
                        sourceCategoryId, destinationCategoryId, noteId,
                        confirmedMembers: project.confirmedMembers.filter(id => id != user._id),
                        projectId
                    }
                })


                if (updatedSourceCategory && updatedDestinationCategory) {
                    return { message: "Update successful", sourceCategoryId, destinationCategoryId, noteId, }
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
        newNote: {
            subscribe: withFilter(
                (_, __, { pubsub }) => pubsub.asyncIterator(NEW_NOTE),
                (payload, variables) => {
                    return (payload.newNote.confirmedMembers.includes(variables.userId));
                },
            ),
        },
        moveNote: {
            subscribe: withFilter(
                (_, __, { pubsub }) => pubsub.asyncIterator(MOVE_NOTE),
                (payload, variables) => {
                    console.log(payload)
                    return (payload.moveNote.confirmedMembers.includes(variables.userId));
                },
            ),
        },


    }
    
}


export default resolver