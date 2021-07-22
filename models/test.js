const mySchema = new mongoose.Schema({
    active: {
        type: Boolean,
        required: true,
        default: false,
        index: true
    },
    //other fields
    
}, { timestamps: true })

mySchema.index({ createdAt: 1 }, { expireAfterSeconds: 900, partialFilterExpression : {active: false } })

