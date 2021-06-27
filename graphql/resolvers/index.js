import userResolver from './userResolver.js'
import projectResolver from './projectResolver.js'
import taskResolver from './taskResolver.js'
import noteResolver from './noteResolver.js'
import teamResolver from './teamResolver.js'
import taskColumnResolver from './taskColumnResolver.js'
import noteCategoryResolver from './noteCategoryResolver.js'

const resolvers = {
    Query: {
        ...userResolver.Query,
        ...projectResolver.Query,
        ...taskColumnResolver.Query,
        ...taskResolver.Query,
        ...noteCategoryResolver.Query,
        ...noteResolver.Query,
        ...teamResolver.Query,
    },
    Mutation: {
        ...userResolver.Mutation,
        ...projectResolver.Mutation,
        ...taskColumnResolver.Mutation,
        ...taskResolver.Mutation,
        ...noteCategoryResolver.Mutation,
        ...noteResolver.Mutation,
        ...teamResolver.Mutation,
    },
    Subscription: {
        ...userResolver.Subscription,
        ...projectResolver.Subscription,
        ...taskColumnResolver.Subscription,
        ...taskResolver.Subscription,
        ...noteCategoryResolver.Subscription,
        ...noteResolver.Subscription,
    }
   
}

export default resolvers