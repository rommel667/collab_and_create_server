import User from '../../models/user.js'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import checkAuth from '../../utils/checkAuth.js';
import taskColumnResolver from './taskColumnResolver.js'
import noteCategoryResolver from './noteCategoryResolver.js';
import teamResolver from './teamResolver.js'
import { mailer } from '../../utils/mailer.js';
import { withFilter } from 'graphql-subscriptions'


const SEND_INVITE = "SEND_INVITE"
const CANCEL_REQUEST = "CANCEL_REQUEST"
const ACCEPT_INVITE = "ACCEPT_INVITE"
const REJECT_INVITE = "REJECT_INVITE"

const resolvers = {
    Query: {
        myInfo: async (_, __, context) => {
            console.log("myInfo");
            const user = await checkAuth(context)
            try {
                const myInfo = await User.findById(user._id)
                return {
                    ...myInfo._doc,
                    password: "password",
                    createdAt: new Date(myInfo.createdAt).toISOString(),
                    colleagues: resolvers.Query.usersInfo(_, { userIds: myInfo.colleagues }),
                    verifiedTeams: teamResolver.Query.verifiedTeams(_, __, context),
                    personalTaskColumns: taskColumnResolver.Query.taskColumnsPersonal(_, { taskColumnIds: myInfo.personalTaskColumns }),
                    personalNoteCategories: noteCategoryResolver.Query.noteCategoriesPersonal(_, { noteCategoryIds: myInfo.personalNoteCategories }),
                    // myPendingInvitesRequest: resolvers.Query.usersInfo(_, { userIds: myInfo.myPendingInvitesRequest }),
                    // myPendingInvitesRespond: resolvers.Query.usersInfo(_, { userIds: myInfo.myPendingInvitesRespond })
                }
            }
            catch (err) {
                throw new Error(err)
            }
        },
        userInfo: async (_, { userId }, context) => {
            console.log("userInfo", userId);
            try {
                const user = await User.findById(userId)
                return { ...user._doc, password: " " }
            }
            catch (err) {
                throw new Error(err)
            }
        },
        usersInfo: async (_, { userIds }) => {
            console.log("usersInfo");
            try {
                const users = await User.find({ _id: { $in: userIds } })
                return users.map(user => {
                    return { ...user._doc, password: " " }
                })
            }
            catch (err) {
                throw new Error(err)
            }
        },
        suggestions: async (_, __, context) => {
            console.log("suggestions");
            const user = await checkAuth(context)
            try {
                const userDetails = await User.findById(user._id)
                const suggestions = await User.find({
                    _id: {
                        $nin: [
                            user._id,
                            ...userDetails.colleagues,
                            ...userDetails.myPendingInvitesRequest,
                            ...userDetails.myPendingInvitesRespond
                        ]
                    }
                })
                return suggestions.map(user => {
                    return { ...user._doc }
                })
            }
            catch (err) {
                throw new Error(err)
            }
        },
        colleagues: async (_, __, context) => {
            console.log("colleagues");
            const user = await checkAuth(context)
            try {
                const userDetails = await User.findById(user._id)
                return userDetails.colleagues.map(id => {
                    return resolvers.Query.userInfo(_, { userId: id })
                })
            }
            catch (err) {
                throw new Error(err)
            }
        },
        pendingInvitesRequest: async (_, __, context) => {
            console.log("pendingInvitesRequest");
            const user = await checkAuth(context)
            try {
                const userDetails = await User.findById(user._id)
                return userDetails.myPendingInvitesRequest.map(id => {
                    return resolvers.Query.userInfo(_, { userId: id })
                })
            }
            catch (err) {
                throw new Error(err)
            }
        },
        pendingInvitesRespond: async (_, __, context) => {
            console.log("pendingInvitesRequest");
            const user = await checkAuth(context)
            try {
                const userDetails = await User.findById(user._id)
                return userDetails.myPendingInvitesRespond.map(id => {
                    return resolvers.Query.userInfo(_, { userId: id })
                })
            }
            catch (err) {
                throw new Error(err)
            }
        },
    },
    Mutation: {
        login: async (_, { email, password }) => {
            console.log("login");
            try {
                const user = await User.findOne({ email })
                if (!user) {
                    throw new Error('Wrong credentials!')
                }
                if (user.verified === false) {
                    throw new Error('Please check your email for verification code to proceed')
                }
                const match = await bcrypt.compare(password, user.password)
                if (!match) {
                    throw new Error('Wrong credentials')
                }
                const token = jwt.sign({
                    _id: user._id,
                    email: user.email,
                    name: user.name,
                    photo: user.photo
                }, process.env.JWT_SECRET, { expiresIn: '10h' })
                return { ...user._doc, token }
            }
            catch (err) {
                throw new Error(err)
            }
        },
        registerUser: async (_, { userInput: { name, email, password } }) => {
            console.log("registerUser");
            const user = await User.findOne({ email })
            if (user) {
                throw new Error('Email already registered')
            }
            const personalTasks = ["Unstarted", "Ongoing", "Finished"]
            const personalCategories = ["Meetings Minutes", "Project Variables", "Others"]
            const hashedPassword = await bcrypt.hash(password, 12)
            try {
                const verificationCode = Math.floor(Math.random() * 8999 + 1000)
                const taskColumns = await Promise.all(personalTasks.map(async (task, index) => {
                    const tc = await taskColumnResolver.Mutation.initialTaskColumnPersonal(_, {
                        columnName: task,
                        sequence: index + 1,
                    })
                    return tc._id
                }))
                const noteCategories = await Promise.all(personalCategories.map(async (category, index) => {
                    const nc = await noteCategoryResolver.Mutation.initialNoteCategoryPersonal(_, {
                        categoryName: category,
                        sequence: index + 1,
                    })
                    return nc._id
                }))
                const user = new User({
                    name: name,
                    email: email,
                    password: hashedPassword,
                    photo: "https://res.cloudinary.com/rommel/image/upload/v1601204560/tk58aebfctjwz7t74qya.jpg",
                    verified: false,
                    verificationCode: verificationCode,
                    personalTaskColumns: taskColumns,
                    personalNoteCategories: noteCategories
                })
                const result = await user.save()
                

                if (result) {
                    mailer(result.email, result.name, result.verificationCode)
                }

                return { ...result._doc }
            }
            catch (err) {
                throw new Error(err)
            }
        },
        signInWithGoogle: async (_, { name, email, photo, token }) => {
            console.log("signInWithGoogle");
            try {
                const user = await User.findOne({ email })
                const hashedPassword = await bcrypt.hash(`${process.env.GOOGLE_LOGIN_PASSWORD}${email}`, 12)
                if (!user) {
                    const newUser = await new User({
                        name: name,
                        email: email,
                        photo: photo,
                        password: hashedPassword,
                        verificationCode: 1,
                        verified: true
                    })
                    const result = await newUser.save()
                    const newToken = jwt.sign({
                        _id: result._id,
                        email: result.email,
                        name: result.name,
                        photo: result.photo
                    }, process.env.JWT_SECRET, { expiresIn: '1000h' })
                    return { ...result._doc, token: newToken }
                } else {
                    const newToken = jwt.sign({
                        _id: user._id,
                        email: user.email,
                        name: user.name,
                        photo: user.photo
                    }, process.env.JWT_SECRET, { expiresIn: '1000h' })
                    return { ...user._doc, token: newToken }
                }
            }
            catch (err) {
                throw new Error(err)
            }
        },
        editProfile: async (_, { _id, name, photo }) => {
            console.log("editProfile");
            try {
                const user = await User.findById(_id)
                if (!user) {
                    throw new Error('Usernot found')
                }
                if (photo === "same") {
                    const editedProfile = await User.findByIdAndUpdate(user._id, { $set: { name } }, { new: true })
                    const token = jwt.sign({
                        _id: editedProfile._id,
                        email: editedProfile.email,
                        name: editedProfile.name,
                        photo: editedProfile.photo
                    }, process.env.JWT_SECRET, { expiresIn: '10h' })
                    return { ...editedProfile._doc, token }
                } else {
                    const editedProfile = await User.findByIdAndUpdate(user._id, { $set: { name, photo } }, { new: true })
                    const token = jwt.sign({
                        _id: editedProfile._id,
                        email: editedProfile.email,
                        name: editedProfile.name,
                        photo: editedProfile.photo
                    }, process.env.JWT_SECRET, { expiresIn: '10h' })
                    return { ...editedProfile._doc, token }
                }
            }
            catch (err) {
                throw new Error(err)
            }
        },
        verifyUser: async (_, { email, code }) => {
            console.log("verifyUser");
            try {
                const user = await User.findOne({ email })
                if (!user) {
                    throw new Error('User not found')
                }
                if (parseInt(user.verificationCode) !== parseInt(code)) {
                    throw new Error('Wrong verification code')
                }
                user.verified = true
                const result = await user.save()
                const token = jwt.sign({
                    _id: result._id,
                    email: result.email,
                    name: result.name,
                    photo: result.photo
                }, process.env.JWT_SECRET, { expiresIn: '10h' })
                return { ...result._doc, token }
            }
            catch (err) {
                throw new Error(err)
            }
        },
        resendCode: async (_, { email }) => {
            console.log("resendCode");
            try {
                const user = await User.findOne({ email })
                if (!user) {
                    throw new Error('User not found')
                }
                const verificationCode = Math.floor(Math.random() * 8999 + 1000)
                user.verificationCode = verificationCode
                const result = await user.save()

                if (result) {
                    mailer(result.email, result.name, result.verificationCode)
                }

                return { ...result._doc }
            }
            catch (err) {
                throw new Error(err)
            }
        },
        forgotPasswordEmail: async (_, { email }) => {
            console.log("forgotPasswordEmail");
            try {
                const user = await User.findOne({ email })
                if (!user) {
                    throw new Error('User not found')
                }
                const verificationCode = Math.floor(Math.random() * 8999 + 1000)
                user.verificationCode = verificationCode
                const result = await user.save()

                if (result) {
                    mailer(result.email, result.name, result.verificationCode)
                }

                return { ...result._doc }
            }
            catch (err) {
                throw new Error(err)
            }
        },
        forgotPasswordCode: async (_, { email, code }) => {
            console.log("forgotPasswordCode");
            try {
                const user = await User.findOne({ email })
                if (!user) {
                    throw new Error('User not found')
                }
                if (parseInt(user.verificationCode) !== parseInt(code)) {
                    throw new Error('Wrong verification code')
                }

                return { ...user._doc }
            }
            catch (err) {
                throw new Error(err)
            }
        },
        newPassword: async (_, { email, password }) => {
            console.log("newPassword");
            try {
                const user = await User.findOne({ email })
                const hashedPassword = await bcrypt.hash(password, 12)
                if (!user) {
                    throw new Error('User not found')
                }

                user.password = hashedPassword
                const result = await user.save()


                return { ...result._doc }
            }
            catch (err) {
                throw new Error(err)
            }
        },
        sendInvite: async (_, { colleagueId }, context) => {
            console.log("sendInvite");
            const user = await checkAuth(context)
            try {
                const userDetails = await User.findById(user._id)
                const colleague = await User.findById(colleagueId)
                if (userDetails.colleagues.includes(colleagueId)) {
                    throw new Error("Colleague already exists")
                }
                if (userDetails.myPendingInvitesRequest.includes(colleagueId)) {
                    throw new Error("Colleague already invited")
                }
                if (userDetails.myPendingInvitesRespond.includes(colleagueId)) {
                    throw new Error("Colleague already invited you, please confirm")
                }
                const userUpdate = await User.findByIdAndUpdate(
                    { _id: user._id },
                    { $set: { myPendingInvitesRequest: [...userDetails.myPendingInvitesRequest, colleagueId] } },
                    { new: true }
                )

                const colleagueUpdate = await User.findByIdAndUpdate(
                    { _id: colleagueId },
                    { $set: { myPendingInvitesRespond: [...colleague.myPendingInvitesRespond, user._id] } },
                    { new: true }
                )

                await context.pubsub.publish(SEND_INVITE, {
                    sendInvite: {
                        ...userUpdate._doc,
                        colleagues: resolvers.Query.usersInfo( _, { userIds: userUpdate.colleagues } ),
                        targetUser: colleagueId
                    }
                })

                return {
                    ...colleagueUpdate._doc,
                    // colleagues: resolvers.Query.usersInfo( _, { userIds: colleagueUpdate.colleagues } ),
                    // myPendingInvitesRequest: resolvers.Query.usersInfo( _, { userIds: result.myPendingInvitesRequest } ),
                    // myPendingInvitesRespond: resolvers.Query.usersInfo( _, { userIds: result.myPendingInvitesRespond } ),
                }
            }
            catch (err) {
                throw new Error(err)
            }
        },
        acceptInvite: async (_, { colleagueId }, context) => {
            console.log("confirmInvite");
            const user = await checkAuth(context)
            try {
                const userDetails = await User.findById(user._id)
                const colleague = await User.findById(colleagueId)
                const userUpdate = await User.findByIdAndUpdate(
                    { _id: user._id },
                    {
                        $set:
                        {
                            myPendingInvitesRespond: userDetails.myPendingInvitesRespond.filter(id => id != colleagueId),
                            colleagues: [...userDetails.colleagues, colleagueId]
                        },
                    },

                    { new: true }
                )

                const colleagueUpdate = await User.findByIdAndUpdate(
                    { _id: colleagueId },
                    {
                        $set:
                        {
                            myPendingInvitesRequest: colleague.myPendingInvitesRequest.filter(id => id != user._id),
                            colleagues: [...colleague.colleagues, user._id]
                        }
                    },
                    { new: true }
                )

                await context.pubsub.publish(ACCEPT_INVITE, {
                    acceptInvite: {
                        ...userDetails._doc,
                        colleagues: resolvers.Query.usersInfo( _, { userIds: userUpdate.colleagues } ),
                        targetUser: colleagueId
                    }
                })

                return {
                    ...colleagueUpdate._doc,
                    colleagues: resolvers.Query.usersInfo( _, { userIds: colleagueUpdate.colleagues } ),
                    // myPendingInvitesRequest: resolvers.Query.usersInfo( _, { userIds: result.myPendingInvitesRequest } ),
                    // myPendingInvitesRespond: resolvers.Query.usersInfo( _, { userIds: result.myPendingInvitesRespond } ),
                }
            }
            catch (err) {
                throw new Error(err)
            }
        },
        rejectInvite: async (_, { colleagueId }, context) => {
            console.log("rejectInvite");
            const user = await checkAuth(context)
            try {
                const userDetails = await User.findById(user._id)
                const colleague = await User.findById(colleagueId)
                const userUpdate = await User.findByIdAndUpdate(
                    { _id: user._id },
                    {
                        $set:
                        {
                            myPendingInvitesRespond: userDetails.myPendingInvitesRespond.filter(id => id != colleagueId),
                        },
                    },

                    { new: true }
                )

                const colleagueUpdate = await User.findByIdAndUpdate(
                    { _id: colleagueId },
                    {
                        $set:
                        {
                            myPendingInvitesRequest: colleague.myPendingInvitesRequest.filter(id => id != user._id),
                        }
                    },
                    { new: true }
                )

                await context.pubsub.publish(REJECT_INVITE, {
                    rejectInvite: {
                        ...userDetails._doc,
                        targetUser: colleagueId
                    }
                })

                return {
                    ...colleagueUpdate._doc,
                }
            }
            catch (err) {
                throw new Error(err)
            }
        },
        cancelRequest: async (_, { colleagueId }, context) => {
            console.log("cancelRequest");
            const user = await checkAuth(context)
            try {
                const userDetails = await User.findById(user._id)
                const colleague = await User.findById(colleagueId)
                const userUpdate = await User.findByIdAndUpdate(
                    { _id: user._id },
                    {
                        $set:
                        {
                            myPendingInvitesRequest: userDetails.myPendingInvitesRequest.filter(id => id != colleagueId),
                        },
                    },

                    { new: true }
                )

                const colleagueUpdate = await User.findByIdAndUpdate(
                    { _id: colleagueId },
                    {
                        $set:
                        {
                            myPendingInvitesRespond: colleague.myPendingInvitesRespond.filter(id => id != user._id),
                        }
                    },
                    { new: true }
                )

                await context.pubsub.publish(CANCEL_REQUEST, {
                    cancelRequest: {
                        ...userUpdate._doc,
                        targetUser: colleagueId
                    }
                })

                return {
                    ...colleagueUpdate._doc,
                }
            }
            catch (err) {
                throw new Error(err)
            }
        },
    },
    Subscription: {
        sendInvite: {
            subscribe: withFilter(
                (_, __, { pubsub }) => pubsub.asyncIterator(SEND_INVITE),
                (payload, variables) => {
                    console.log(payload);
                    return (payload.sendInvite.targetUser === variables.userId);
                },
            ),
        },
        acceptInvite: {
            subscribe: withFilter(
                (_, __, { pubsub }) => pubsub.asyncIterator(ACCEPT_INVITE),
                (payload, variables) => {
                    return (payload.acceptInvite.targetUser === variables.userId);
                },
            ),
        },
        rejectInvite: {
            subscribe: withFilter(
                (_, __, { pubsub }) => pubsub.asyncIterator(REJECT_INVITE),
                (payload, variables) => {
                    return (payload.rejectInvite.targetUser === variables.userId);
                },
            ),
        },
        cancelRequest: {
            subscribe: withFilter(
                (_, __, { pubsub }) => pubsub.asyncIterator(CANCEL_REQUEST),
                (payload, variables) => {
                    return (payload.cancelRequest.targetUser === variables.userId);
                },
            ),
        },
    }

}

export default resolvers