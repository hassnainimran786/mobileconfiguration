const nodemailer = require('nodemailer');
const handlebars = require('handlebars');
const fs = require('fs/promises');
require('dotenv').config();
const process = require('process');
const { emailUser, emailPass, emailCC } = process.env;

if (!emailUser || !emailPass) {
    throw new Error("Email SMTP configurations are missing. Please check your .env file");
}

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: emailUser,
        pass: emailPass,
    },
});

async function sendMail(
    to,
    from = "",
    subject,
    message="",
    attachments = [],
    templateName="", // New parameter for template name
    templateData = {}, // New parameter for template data
) {
    try {
        let html = `<p>${message}</p>`
        if(templateName!==""){
            // Read the template file
            const templatePath = `./templates/${templateName}.hbs`; // Adjust the path based on your file structure
            const templateFile = await fs.readFile(templatePath, 'utf-8');
            const template = handlebars.compile(templateFile);
            html = template(templateData);
        }
        // Render the HTML using the template and data

        // Send the email
        await transporter.sendMail({
            from,
            to,
            subject,
            html,
            attachments,
            cc: emailCC || ""
        });
    } catch (error) {
        throw error;
    }
}

module.exports = {
    sendMail
};
