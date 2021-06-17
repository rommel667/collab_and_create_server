import userResolver from './userResolver.js'
import projectResolver from './projectResolver.js'
import taskResolver from './taskResolver.js'
import noteResolver from './noteResolver.js'
import teamResolver from './teamResolver.js'
import taskColumnResolver from './taskColumnResolver.js'

const resolvers = {
    Query: {
        ...userResolver.Query,
        ...projectResolver.Query,
        ...taskColumnResolver.Query,
        ...taskResolver.Query,
        ...noteResolver.Query,
        ...teamResolver.Query,
    },
    Mutation: {
        ...userResolver.Mutation,
        ...projectResolver.Mutation,
        ...taskColumnResolver.Mutation,
        ...taskResolver.Mutation,
        ...noteResolver.Mutation,
        ...teamResolver.Mutation,
    },
    Subscription: {
        ...projectResolver.Subscription,
        ...taskResolver.Subscription,
        ...taskColumnResolver.Subscription,
    }
   
}

export default resolvers