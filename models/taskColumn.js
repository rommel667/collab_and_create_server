import mongoose from 'mongoose'

const taskColumnSchema = new mongoose.Schema({
    columnName: {
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
    tasks: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Task'
        }
    ],
}, { timestamps: true })

export default mongoose.model('TaskColumn', taskColumnSchema)