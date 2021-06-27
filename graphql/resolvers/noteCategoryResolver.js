import Project from '../../models/project.js'
import checkAuth from '../../utils/checkAuth.js'
import NoteCategory from '../../models/noteCategory.js'
import userResolver from './userResolver.js'
import noteResolver from './noteResolver.js'
import { withFilter } from 'graphql-subscriptions'
import user from '../../models/user.js'

const NEW_NOTE_CATEGORY = "NEW_NOTE_CATEGORY"
const MOVE_NOTE_CATEGORY = "MOVE_NOTE_CATEGORY"

export default {
    Query: {
        noteCategoriesByProject: async (_, { noteCategoryIds }) => {
            console.log("noteCategoriesByProject" );

            try {
                const noteCategories = await NoteCategory.find({ _id: { $in: noteCategoryIds } })
                if (!noteCategories) {
                    throw new Error(`No categories created`)
                }
                return noteCategories.map(noteCategory => {
                    return {
                        ...noteCategory._doc,
                        createdBy: userResolver.Query.userInfo(_, { userId: noteCategory.createdBy }),
                        notes: noteResolver.Query.notesByCategory(_, { noteIds: noteCategory.notes })
                    }
                })
            }
            catch (err) {
                throw new Error(err)
            }
        },
        noteCategoriesPersonal: async (_, { noteCategoryIds }) => {
            console.log("noteCategoriesPersonal",);

            try {
                const noteCategories = await NoteCategory.find({ _id: { $in: noteCategoryIds } })
                if (!noteCategories) {
                    throw new Error(`No categories created`)
                }
                return noteCategories.map(noteCategory => {
                    return {
                        ...noteCategory._doc,
                        notes: noteResolver.Query.notesByCategory(_, { noteIds: noteCategory.notes })
                    }
                })
            }
            catch (err) {
                throw new Error(err)
            }
        },
    },

    Mutation: {
        newNoteCategory: async (_, { categoryName, projectId }, context) => {
            console.log("newNoteCategory");
            const user = await checkAuth(context)
            try {
                const project = await Project.findById(projectId)
                const autoSequence = await project.noteCategories.length + 1
                const newNoteCategory = new NoteCategory({
                    categoryName, projectId, sequence: autoSequence, createdBy: user._id
                })
                const result = await newNoteCategory.save()
                const projectNoteCategoryUpdate = await Project.findByIdAndUpdate({ _id: projectId }, { $set: { noteCategories: [...project.noteCategories, result._id] } }, { new: true })
                
                await context.pubsub.publish(NEW_NOTE_CATEGORY, {
                    newNoteCategory: {
                        ...result._doc,
                        createdBy: user,
                        confirmedMembers: project.confirmedMembers.filter(id => id != user._id),
                    }
                })

                console.log("RESULT", result);
                
                return {
                    ...result._doc,
                    createdBy: userResolver.Query.userInfo(_, { userId: result.createdBy }),
                    // notes: noteResolver.Query.notesByCategory(_, { noteIds: result.notes })
                }

            }
            catch (err) {
                throw new Error(err)
            }
        },
        initialNoteCategoryPersonal: async (_, { categoryName, sequence, createdBy }) => {
            console.log("newNoteCategoryPersonal");
            try {
                const newNoteCategory = new NoteCategory({
                    categoryName, sequence, createdBy
                })
                const result = await newNoteCategory.save()
                return {
                    ...result._doc,
                }
            }
            catch (err) {
                throw new Error(err)
            }
        },
        moveNoteCategory: async (_, { noteCategoryIds, projectId }, context) => {
            console.log("moveNoteCategory");
            const user = await checkAuth(context)
            try {
                
                const project = await Project.findById(projectId)
                const newNoteCategories = await noteCategoryIds.map(async (categoryId, index) => {
                    await NoteCategory.findByIdAndUpdate({ _id: categoryId}, { $set: { sequence: index + 1 } }, { new: true })
                })

                await context.pubsub.publish(MOVE_NOTE_CATEGORY, {
                    moveNoteCategory: {
                        newSequenceIds: noteCategoryIds,
                        confirmedMembers: project.confirmedMembers.filter(id => id != user._id),
                        projectId
                    }
                })

                return {
                    newSequenceIds: noteCategoryIds,
                    projectId
                }

            }
            catch (err) {
                throw new Error(err)
            }
        },

    },
    Subscription: {
        newNoteCategory: {
            subscribe: withFilter(
                (_, __, { pubsub }) => pubsub.asyncIterator(NEW_NOTE_CATEGORY),
                (payload, variables) => {
                    console.log("PAYLOAD",payload);
                    console.log("VARIABLES",variables);
                    return (payload.newNoteCategory.confirmedMembers.includes(variables.userId));
                },
            ),
        },
        moveNoteCategory: {
            subscribe: withFilter(
                (_, __, { pubsub }) => pubsub.asyncIterator(MOVE_NOTE_CATEGORY),
                (payload, variables) => {
                    return (payload.moveNoteCategory.confirmedMembers.includes(variables.userId));
                },
            ),
        },
        

    }

}