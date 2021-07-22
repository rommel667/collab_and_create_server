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
import { RedisPubSub } from 'graphql-redis-subscriptions'
import Redis from 'ioredis';
import redis from 'redis'
import { promisify } from 'util'

const app = express()

app.use(cors())

// const options = {
//     host: process.env.REDIS_HOST,
//     port: Number(process.env.REDIS_PORT),
//     password: process.env.REDIS_PASSWORD,
//   };

//   const pubsub = new RedisPubSub({
//     publisher: new Redis(options),
//     subscriber: new Redis(options)
//   });

const client = redis.createClient({
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT),
    password: process.env.REDIS_PASSWORD
})

export const GET_ASYNC = promisify(client.get).bind(client)
export const SET_ASYNC = promisify(client.set).bind(client)
export const DEL_ASYNC = promisify(client.del).bind(client)
export const expiry = 3600


export const pubsub = new PubSub()

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
    dbName: process.env.DB_NAME,
    useNewUrlParser: true,
    useCreateIndex: true,
    useUnifiedTopology: true,
    useFindAndModify: false
})
    .then(() => {
        console.log(`MongoDB Connected`);
        return httpServer.listen(process.env.PORT)
    })
    .then((res) => {
        console.log(`GraphQL Server running at http://localhost:${process.env.PORT}${server.graphqlPath}`);
    })