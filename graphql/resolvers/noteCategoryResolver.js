import Project from '../../models/project.js'
import checkAuth from '../../utils/checkAuth.js'
import NoteCategory from '../../models/noteCategory.js'
import userResolver from './userResolver.js'
import noteResolver from './noteResolver.js'
import { withFilter } from 'graphql-subscriptions'
import user from '../../models/user.js'

const MOVE_NOTE_CATEGORY = "MOVE_NOTE_CATEGORY"

export default {
    Query: {
        noteCategoriesByProject: async (_, { noteCategoryIds }) => {
            console.log("noteCategoriesByProject");

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
                return {
                    ...result._doc,
                    createdBy: userResolver.Query.userInfo(_, { userId: result.createdBy }),
                    notes: noteResolver.Query.notesByCategory(_, { noteIds: result.notes })
                }

            }
            catch (err) {
                throw new Error(err)
            }
        },
        initialNoteCategoryPersonal: async (_, { categoryName, sequence }) => {
            console.log("newNoteCategoryPersonal");
            try {
                const newNoteCategory = new NoteCategory({
                    categoryName, sequence
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
                        newSequenceIds: taskColumnIds,
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