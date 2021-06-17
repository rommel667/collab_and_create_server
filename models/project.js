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
    icon: {
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
    notes: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Note'
        }
    ]

}, { timestamps: true })

export default mongoose.model('Project', projectSchema)