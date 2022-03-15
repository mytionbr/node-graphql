require('dotenv').config();

const { ApolloServer, gql, AuthenticationError } = require('apollo-server');
const { v4: uuid} = require('uuid');

const { getToken, getUserIdFromToken, getUser } = require('./auth');

const typeDefs = gql`
    type Quote {
        id: ID!
        phrase: String!
        quotee: String
    }

    type Query {
        quotes: [Quote]
    }

    type Mutation {
        addQuote(phrase: String!, quotee: String): Quote
        editQuote(id: ID!, phrase: String, quotee: String): Quote
        deleteQuote(id: ID!): DeleteResponse
        login(username: String!, password: String!): Authentication
    }

    type DeleteResponse {
        ok: Boolean!
    }

    type Authentication {
        token: String!
    }
`;

const quotes = {}
const addQuote = quote => {
    const id = uuid();
    return quotes[id] = { ...quote, id};
}

addQuote({ phrase: "Test 1", quotee: "Fulano de tal" });
addQuote({ phrase: "Test 2", quotee: "Fulano de tal 2" });
addQuote({ phrase: "Test 3", quotee: "Fulano de tal 3" });

const resolvers = {
    Query: {
        quotes: () => Object.values(quotes)
    },
    Mutation: {
        addQuote: async (parent, quote, context) => {
            if (!context.user) throw new AuthenticationError("You must be logged in to perform this action")
            return addQuote(quote);
        },
        editQuote: async (parent, { id, ...quote }, context) => {
            if (!context.user) throw new AuthenticationError("You must be logged in to perform this action")
            
            if(!quotes[id]) {
                throw new Error("Quote doesn't exist");
            }

            quotes[id] = {
                ...quotes[id],
                ...quote,
            }

            return quotes[id];
        },
        deleteQuote: async (parent, { id }, context) => {
            if (!context.user) throw new AuthenticationError("You must be logged in to perform this action")
            
            const ok = Boolean(quotes[id]);
            delete quotes[id];

            return { ok }
        },
        login: async (parent, { username, password }) => ({
            token: await getToken({username, password})
        })
    }
}

const context = async ({ req }) => {
    const [,token] = (req.headers.authorization || '').split("Bearer ");

    return {
        user: await getUser(await getUserIdFromToken(token)),
    }
}

const server = new ApolloServer({ typeDefs, resolvers, context });

server.listen().then(({ url }) => {
    console.log(`Server ready at ${url}`)
})