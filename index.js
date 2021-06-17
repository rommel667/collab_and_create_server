import dotenv from 'dotenv'
dotenv.config()
import express from 'express'
import apolloServer from 'apollo-server-express'
const { ApolloServer, PubSub } = apolloServer;
import mongoose from 'mongoose'
import typeDefs from './graphql/schema/index.js'
import resolvers from './graphql/resolvers/index.js'
import { createServer } from 'http'
import cors from 'cors'

export const pubsub = new PubSub()

const app = express()

app.use(cors())

const server = new ApolloServer({
    typeDefs: typeDefs,
    resolvers: resolvers,
    context: ({ req, res }) => {
        // console.log(req);
        return { req, res, pubsub }
    }
})

server.applyMiddleware({ app })

app.get('/', (req, res) => res.send('Welcome to MyProjectManager'))

const httpServer = createServer(app)
server.installSubscriptionHandlers(httpServer)



mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useUnifiedTopology: true,
    useFindAndModify: false
})
    .then(() => {
        console.log("Connected to MongoDB");
        return httpServer.listen(process.env.PORT)
    })
    .then(res => {
        console.log(`GraphQL Server running at http://localhost:${process.env.PORT}${server.graphqlPath}`);
    })