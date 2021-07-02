import gql from 'graphql-tag'

const typeDefs = gql`

    input UserInput {
        name: String!
        email: String!
        password: String!
    }


    input ProjectInput {
        projectName: String!
        description: String!
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
        skills: [String]
        portfolio: String
        token: String
        verified: Boolean!
        colleagues: [User]!
        verifiedTeams: [Team]!
        unverifiedTeams: [Team]!
        myPendingInvitesRequest: [User]!
        myPendingInvitesRespond: [User]!
        personalTaskColumns: [TaskColumn]!
        personalNoteCategories: [NoteCategory]!
        createdAt: String!
        updatedAt: String!
    }

    type Team {
        _id: ID!
        teamName: String!
        members: [User]!
        createdBy: User!
        projects: [Project]!
        createdAt: String!
        updatedAt: String!
    }
    type TeamInviteResponse {
        user: User!
        teamId: ID!
    }

    type Project {
        _id: ID!
        projectName: String!
        description: String!
        status: String!
        techStacks: [String]!
        createdBy: User!
        unconfirmMembers: [User]!
        confirmedMembers: [User]!
        rejectedInviteMembers: [User]!
        taskColumns: [TaskColumn]!
        noteCategories: [NoteCategory]!
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
        projectId: ID
        columnId: ID!
    }

    type MoveTaskUpdate {
        message: String!
        sourceColumnId: ID
        destinationColumnId: ID
        taskId: ID
        projectId: ID
    }

    type MoveNoteUpdate {
        message: String!
        sourceCategoryId: ID
        destinationCategoryId: ID
        noteId: ID
        projectId: ID
    }

    type NoteCategory {
        _id: ID!
        categoryName: String!
        sequence: Int!
        createdBy: User
        notes: [Note]!
        projectId: ID!
        createdAt: String!
        updatedAt: String!
    }

    type Note {
        _id: ID!
        description: String!
        createdBy: User!
        projectId: ID
        categoryId: ID!
        createdAt: String!
        updatedAt: String!
    }

    type Query {
        myInfo: User!
        userInfo(userId: ID!): User!
        usersInfo(userIds: [ID]!): [User]!
        colleagues: [User]!
        suggestions: [User]!
        pendingInvitesRequest: [User]!
        pendingInvitesRespond: [User]!

        verifiedTeams: [Team]!
        unverifiedTeams: [Team]!

        projectsByUser: [Project]!
        projectInfo(projectId: ID!): Project!
        projectsInfo(projectIds: [ID]!): [Project]!
        unconfirmProjectInvites: [Project]!

        taskColumnsByProject(taskColumnIds: [ID]!): [TaskColumn]!
        taskColumnsPersonal(taskColumnIds: [ID]!): [TaskColumn]!

        tasksByProject(taskColumnIds: [ID]!): [Task!]!
        tasksByColumn(taskIds: [ID]!): [Task!]!

        noteCategoriesByProject(taskColumnIds: [ID]!): [NoteCategory]!
        noteCategoriesPersonal(taskColumnIds: [ID]!): [NoteCategory]!

        notesByProject(noteCategoryIds: [ID]!): [Note!]!
        notesByCategory(noteIds: [ID]!): [Note!]!
    }

    type Mutation {
        login(email: String!, password: String!): User!
        registerUser(userInput: UserInput!): User!
        signInWithGoogle(name: String!, email: String!, photo: String!, token: String!): User!
        editProfile(name: String, photo: String, skills: [String], portfolio: String): User!
        verifyUser(email: String!, code: String!): User!
        resendCode(email: String!): User!
        forgotPasswordEmail(email: String!): User!
        forgotPasswordCode(email: String!, code: String!): User!
        newPassword(email: String!, password: String!): User!
        sendInvite(colleagueId: ID!): User!
        acceptInvite(colleagueId: ID!): User!
        rejectInvite(colleagueId: ID!): User!
        cancelRequest(colleagueId: ID!): User!
        

        newTeam(teamName: String! members: [ID]!): Team!
        acceptTeamInvite(teamId: ID!): TeamInviteResponse!
        rejectTeamInvite(teamId: ID!): TeamInviteResponse!
        newTeamMember(memberId: String!): [User]!

        newProject(projectInput: ProjectInput!): Project!
        acceptProjectInvite(projectId: ID!): Project!
        rejectProjectInvite(projectId: ID!): Project!

        newTaskColumn(columnName: String!, projectId: ID!): TaskColumn!
        initialTaskColumnPersonal(columnName: String!, sequence: Int): TaskColumn!
        moveTaskColumn(taskColumnIds: [ID]!, projectId: ID!): NewSequence! 

        newTask(description: String!, inCharge: [ID], columnId: ID! projectId: ID!): Task!
        newTaskPersonal(description: String!, columnId: ID!): Task!
        moveTask(sourceColumnId: ID! destinationColumnId: ID! taskId: ID! projectId: ID!): MoveTaskUpdate!

        newNoteCategory(categoryName: String!, projectId: ID!): NoteCategory!
        initialNoteCategoryPersonal(categoryName: String!, sequence: Int): NoteCategory!
        moveNoteCategory(noteCategoryIds: [ID]!, projectId: ID!): NewSequence! 

        newNote(description: String!, categoryId: ID! projectId: ID!): Note!
        newNotePersonal(description: String!, categoryId: ID!): Note!
        moveNote(sourceCategoryId: ID! destinationCategoryId: ID! noteId: ID! projectId: ID!): MoveNoteUpdate!
    }

    type Subscription {
        sendInvite(userId: ID!): User!
        cancelRequest(userId: ID!): User!
        acceptInvite(userId: ID!): User!
        rejectInvite(userId: ID!): User!

        newTeam(userId: ID!): Team!
        acceptTeamInvite(userId: ID!): TeamInviteResponse!
        rejectTeamInvite(userId: ID!): TeamInviteResponse!

        newProject(userId: ID!): Project

        newTaskColumn(userId: ID!): TaskColumn!
        moveTaskColumn(userId: ID!): NewSequence

        newTask(userId: ID!): Task
        moveTask(userId: ID!): MoveTaskUpdate!

        newNoteCategory(userId: ID!): NoteCategory!
        moveNoteCategory(userId: ID!): NewSequence

        newNote(userId: ID!): Note
        moveNote(userId: ID!): MoveNoteUpdate!
    }

    
`;

export default typeDefs;