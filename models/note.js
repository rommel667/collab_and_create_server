import mongoose from 'mongoose'

const noteSchema = new mongoose.Schema({
    description: {
        type: String,
        required: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },

}, { timestamps: true })

export default mongoose.model('Note', noteSchema)