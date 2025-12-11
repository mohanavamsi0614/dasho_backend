import axios from "axios";
import { EMAIL_SERVICE_URL, BACKEND_URL, FRONTEND_URL } from "../config.js";
import { getRegistrationEmailTemplate, getPaymentEmailTemplate, getWelcomeEmailTemplate } from "./emailTemplates.js";

export const sendRegistrationEmail = async (user, eventData, qrCodePath) => {
  try {
    const response = await axios.post(EMAIL_SERVICE_URL, {
      to: user.email,
      subject: `Registration Successful for ${eventData.eventTitle}`,
      html: getRegistrationEmailTemplate(user, eventData, qrCodePath)
    });
    console.log('Email sent successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

export const sendPaymentEmail = async (user, eventData, teamName, paymentLink) => {
  try {
    console.log(user);
    const response = await axios.post(EMAIL_SERVICE_URL, {
      to: user.email,
      subject: `Payment for ${eventData.eventTitle}`,
      html: getPaymentEmailTemplate(user, eventData, teamName, paymentLink)
    });
    console.log(response.data);
  } catch (e) {
    console.log("error", e);
  }
};

export const sendWelcomeEmail = async (members, eventData, teamName) => {
  try {
    const response = await axios.post(EMAIL_SERVICE_URL, {
      to: members,
      subject: `Welcome to ${eventData.eventTitle}`,
      html: getWelcomeEmailTemplate(members, eventData, teamName)
    });
  } catch {
    // Silent fail as per original implementation
  }
};
