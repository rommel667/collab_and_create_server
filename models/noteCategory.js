import mongoose from 'mongoose'

const noteCategorySchema = new mongoose.Schema({
    categoryName: {
        type: String,
        required: true
    },
    sequence: {
        type: Number,
        required: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    projectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project'
    },
    notes: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Note'
        }
    ],
}, { timestamps: true })

export default mongoose.model('NoteCategory', noteCategorySchema)