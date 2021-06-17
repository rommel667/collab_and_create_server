import { createTransport } from 'nodemailer'
import Email from 'email-templates'

const transporter = createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
        user: process.env.GMAIL_EMAIL,
        pass: process.env.GMAIL_PASSWORD
    }
})

const email = new Email({
    transport: transporter,
    send: true,
    preview: false,
});

export const mailer = (userEmail, name, code) => {
    console.log(userEmail);
    email.send({
        template: 'hello',
        message: {
            from: process.env.GMAIL_EMAIL,
            to: userEmail,
        },
        locals: {
            name,
            code
        },
      }).then(() => console.log('email has been send!'));
}






