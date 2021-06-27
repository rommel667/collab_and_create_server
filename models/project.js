import mongoose from 'mongoose'

const projectSchema = new mongoose.Schema({
    projectName: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    status: {
        type: String,
        required: true
    },
    techStacks: [
        {
            type: String,
            required: true
        }
    ],
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    unconfirmMembers: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    ],
    confirmedMembers: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    ],
    rejectedInviteMembers: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    ],
    taskColumns: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'TaskColumn'
        }
    ],
    noteCategories: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'NoteCategory'
        }
    ],

}, { timestamps: true })

export default mongoose.model('Project', projectSchema)