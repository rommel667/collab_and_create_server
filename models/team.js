import mongoose from 'mongoose'

const teamSchema = new mongoose.Schema({
    teamName: {
        type: String,
        required: true
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
}, { timestamps: true })

export default mongoose.model('Team', teamSchema)