import dotenv from 'dotenv'
dotenv.config()
import { createTransport } from 'nodemailer'
import Email from 'email-templates'


const transporter = createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
})

const email = new Email({
    transport: transporter,
    send: true,
    preview: false,
});

export const mailer = (userEmail, name, code) => {
    email.send({
        template: 'hello',
        message: {
            from: process.env.EMAIL_USER,
            to: userEmail,
        },
        locals: {
            name,
            code
        },
      }).then(() => console.log('email has been send!'));
}






