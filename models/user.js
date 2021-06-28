import mongoose from 'mongoose'

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    photo: {
        type: String,
        required: true
    },
    skills: [
        {
            type: String,
        }
    ],
    portfolio: {
        type: String,
    },
    verified: {
        type: Boolean,
        required: true
    },
    verificationCode: {
        type: String,
        required: true
    },
    colleagues: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    ],
    myPendingInvitesRequest: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    ],
    myPendingInvitesRespond: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    ],
    verifiedTeams: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Team'
        }
    ],
    unverifiedTeams: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Team'
        }
    ],
    personalTaskColumns: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'TaskColumn'
        }
    ],
    personalNoteCategories: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'NoteCategory'
        }
    ],
}, { timestamps: true })

export default mongoose.model('User', userSchema)