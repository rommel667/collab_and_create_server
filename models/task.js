import mongoose from 'mongoose'

const taskSchema = new mongoose.Schema({
    description: {
        type: String,
        required: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    columnId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TaskColumn'
    },
    projectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project'
    },
    inCharge: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    ],

}, { timestamps: true })

export default mongoose.model('Task', taskSchema)