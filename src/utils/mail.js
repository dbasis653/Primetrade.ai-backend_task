import { text } from "express";
import Mailgen from "mailgen";
import nodemailer from "nodemailer";

const sendEmail = async (options) => {
  const mailGenerator = new Mailgen({
    theme: "default",
    product: {
      name: "MrManager",
      link: "https://abc.com",
    },
  });
  const emailTextual = mailGenerator.generatePlaintext(options.mailGenContent);
  const emailHTML = mailGenerator.generate(options.mailGenContent);

  const transporter = nodemailer.createTransport({
    host: process.env.MAILTRAP_SMTP_HOST,
    port: process.env.MAILTRAP_SMTP_PORT,
    auth: {
      user: process.env.MAILTRAP_SMTP_USER,
      pass: process.env.MAILTRAP_SMTP_PASS,
    },
  });

  const mail = {
    from: "dbasis653@gmail.com",
    to: options.email,
    subject: options.subject,
    text: emailTextual,
    html: emailHTML,
  };

  try {
    await transporter.sendMail(mail);
    //transporter.sendMail() is a method of 'transport' not our function
  } catch (error) {
    console.error("Check MAILTRAP credentials in  .env");
    console.error("Error: ", error);
  }
};

//generating EMAIL VERIFICATION LINK
const emailVerificationMailContent = (username, verificationUrl) => {
  return {
    body: {
      name: username,
      intro: "Welcome to MrManager !!",
      action: {
        instructions: "To verify,  click on the link below",
        button: {
          color: "#2bdc86ff",
          text: "Verify your email",
          link: verificationUrl,
        },
      },
      outro:
        "Need help or questions ? Just reply to this email. We'd love to help",
    },
  };
};

//FORGOT PASSWORD
const forgotPasswordMailContent = (username, passwordResetUrl) => {
  return {
    body: {
      name: username,
      intro: "We got a request to reset the password of your account !!",
      action: {
        instructions: "To reset,  click on the link below ",
        button: {
          color: "#dc2b2bff",
          text: "Reset your password",
          link: passwordResetUrl,
        },
      },
      outro:
        "Need help or questions ? Just reply to this email. We'd love to help",
    },
  };
};

export { emailVerificationMailContent, forgotPasswordMailContent, sendEmail };
