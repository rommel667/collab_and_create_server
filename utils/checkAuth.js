import jwt from 'jsonwebtoken'
import googleAuth from 'google-auth-library'
const { OAuth2Client } = googleAuth


// const checkAuth = async (context) => {
//     const authHeader = context.req.headers.authorization
//     console.log("CHECKAUTH");
//     if (authHeader) {
//         const token = authHeader.split('Bearer ')[1]
//         if (token) {
//             const user = jwt.verify(token, process.env.JWT_SECRET)
//                 if (user) {
//                     return user   
//                 } else {
//                     throw new Error('Invalid/Expired Token')
//                 }  
//         }
//         throw new Error('Authentication Token Fail')
//     }
//     throw new Error('Authorization Header Fail')
// }


const checkAuth = async (context) => {
    const authHeader = context.req.headers.authorization
    console.log("CHECKAUTH");
    if (authHeader) {
        const token = authHeader.split('Bearer ')[1]
        if (token) {
            try {
                const client = new OAuth2Client(process.env.GOOGLE_ID);
                const ticket = await client.verifyIdToken({
                    idToken: token,
                    audience: process.env.GOOGLE_ID,
                });
                const user = ticket.getPayload();
                console.log(user);
                return user
                    // const userid = payload['sub'];
            }
            catch (err) {
                if (err) {
                    const user = jwt.verify(token, process.env.JWT_SECRET)
                    return user   
                } else {
                    throw new Error('Invalid/Expired Token')
                }  
            }
        }
        throw new Error('Authentication Token Fail')
    }
    throw new Error('Authorization Header Fail')
}

export default checkAuth

