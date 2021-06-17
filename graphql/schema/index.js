import gql from 'graphql-tag'

const typeDefs = gql`

    input UserInput {
        name: String!
        email: String!
        password: String!
    }

    input TeamInput {
        teamName: String!
        leader: ID!
        members: [ID]!
    }

    input ProjectInput {
        projectName: String!
        description: String!
        icon: String!
        techStacks: [String]!
        unconfirmMembers: [ID]!
    }


    input NoteInput {
        description: String!
        projectId: String!
    }

   
    type User {
        _id: ID!
        name: String!
        email: String!
        password: String!
        photo: String
        token: String
        verified: Boolean!
        colleagues: [User]!
        verifiedTeams: [Team]!
        unverifiedTeams: [Team]!
        myPendingInvitesRequest: [User]!
        myPendingInvitesRespond: [User]!
        personalTaskColumns: [TaskColumn]!
        createdAt: String!
        updatedAt: String!
    }

    type Team {
        _id: ID!
        teamName: String!
        leader: User!
        members: [User]!
        createdBy: User!
        projects: [Project]!
        tasks: [Task]!
        notes: [Note]!
        createdAt: String!
        updatedAt: String!
    }

    type Project {
        _id: ID!
        projectName: String!
        description: String!
        status: String!
        icon: String!
        techStacks: [String]!
        createdBy: User!
        unconfirmMembers: [User]!
        confirmedMembers: [User]!
        rejectedInviteMembers: [User]!
        taskColumns: [TaskColumn]!
        notes: [Note]!
        createdAt: String!
        updatedAt: String!
    }

    type TaskColumn {
        _id: ID!
        columnName: String!
        sequence: Int!
        createdBy: User
        tasks: [Task]!
        projectId: ID!
        createdAt: String!
        updatedAt: String!
        
    }
    type NewSequence {
        newSequenceIds: [ID]!
        confirmedMembers: [ID]
        projectId: ID!
    }

    type Task {
        _id: ID!
        description: String!
        createdBy: User!
        inCharge: [User]
        createdAt: String!
        updatedAt: String!
        projectId: ID!
        columnId: ID!
    }

    type UpdateMessage {
        message: String!
        sourceColumnId: ID
        destinationColumnId: ID
        taskId: ID
        projectId: ID
    }

    type Note {
        _id: ID!
        description: String!
        createdBy: User!
        createdAt: String!
        updatedAt: String!
    }

    type Query {
        myInfo: User!
        userInfo: User!
        usersInfo: [User]!
        colleagues: [User]!
        suggestions: [User]!
        pendingInvitesRequest: [User]!
        pendingInvitesRespond: [User]!

        verifiedTeams: [Team]!
        unverifiedTeams: [Team]!
        leader: User!
        members: [User]!

        projectsByUser: [Project]!
        projectInfo(projectId: ID!): Project!
        unconfirmProjectInvites: [Project]!

        taskColumnsByProject(taskColumnIds: [ID]!): [TaskColumn]!

        tasksByProject(taskColumnIds: [ID]!): [Task!]!
        tasksByColumn(taskIds: [ID]!): [Task!]!

        notesByProject(projectId: String!): [Note!]!
    }

    type Mutation {
        login(email: String!, password: String!): User!
        registerUser(userInput: UserInput!): User!
        signInWithGoogle(name: String!, email: String!, photo: String!, token: String!): User!
        verifyUser(email: String!, code: String!): User!
        resendCode(email: String!): User!
        forgotPasswordEmail(email: String!): User!
        forgotPasswordCode(email: String!, code: String!): User!
        newPassword(email: String!, password: String!): User!
        sendInvite(colleagueId: ID!): User!
        acceptInvite(colleagueId: ID!): User!
        rejectInvite(colleagueId: ID!): User!
        cancelRequest(colleagueId: ID!): User!
        

        createNewTeam(teamInput: TeamInput!): Team!
        newTeamMember(memberId: String!): [User]!

        newProject(projectInput: ProjectInput!): Project!
        acceptProjectInvite(projectId: ID!): Project!
        rejectProjectInvite(projectId: ID!): Project!

        newTaskColumn(columnName: String!, projectId: ID!): TaskColumn!
        newTaskColumnPersonal(columnName: String!, sequence: Int, projectId: ID!): TaskColumn!
        moveTaskColumn(taskColumnIds: [ID]!, projectId: ID!): NewSequence! 

        newTask(description: String!, inCharge: [ID], columnId: ID! projectId: ID!): Task!
        moveTask(sourceColumnId: ID! destinationColumnId: ID! taskId: ID! projectId: ID!): UpdateMessage!

        newNote(description: String!, projectId: ID): Note!
    }

    type Subscription {
        newProject(userId: ID!): Project

        newTask(userId: ID!): Task
        moveTask(userId: ID!): UpdateMessage!

        moveTaskColumn(userId: ID!): NewSequence
    }

    
`;

export default typeDefs;