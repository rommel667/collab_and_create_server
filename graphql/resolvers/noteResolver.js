import Note from '../../models/note.js'
import Project from '../../models/project.js'



export default {
    Query: {
        notesByProject: async (_, { projectId }) => {
            console.log("notesByProject");
            try {
                const notes = await Note.find({ projectId })
                console.log(notes);
                if (!notes) {
                    throw new Error(`No notes added on this project`)
                }
                return notes.map(note => {
                    return { ...note._doc }
                })
            }
            catch (err) {
                throw new Error(err)
            }
        },
    },

    Mutation: {
        newNote: async (_, { noteInput: { description, projectId } }, context) => {
            console.log("newNote");
            const user = await checkAuth(context)
            let newNote;
            try {
                if (projectId) {
                    newNote = new Note({
                        description, projectId, createdBy: user._id
                    })
                } else {
                    newNote = new Note({
                        description, projectId: `personal-${user._id}`, createdBy: user._id
                    })
                }

                const result = await newNote.save()
                const project = await Project.findOne({ _id: projectId })
                await Project.findByIdAndUpdate(projectId, { $set: { notes: [...project.notes, result._id] } }, { new: true })
                return { ...result._doc }
            }
            catch (err) {
                throw new Error(err)
            }
        },
    }
}