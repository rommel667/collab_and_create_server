import mongoose from 'mongoose'

const teamSchema = new mongoose.Schema({
    teamName: {
        type: String,
        required: true
    },
    leader: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    members: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    ],
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    projects: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Project'
        }
    ],
    tasks: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Task'
        }
    ],
    notes: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Note'
        }
    ]
}, { timestamps: true })

export default mongoose.model('Team', teamSchema)