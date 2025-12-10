import axios from "axios";
import { EMAIL_SERVICE_URL, BACKEND_URL, FRONTEND_URL } from "../config.js";

export const sendRegistrationEmail = async (user, eventData, qrCodePath) => {
  try {
    const response = await axios.post(EMAIL_SERVICE_URL, {
      to: user.email,
      subject: `Registration Successful for ${eventData.eventTitle}`,
      html: `
<div style="font-family: Arial, sans-serif; background-color: #000000; padding: 20px; color: #FFFFFF;">
  <div style="max-width: 600px; margin: auto; background: #111111; border-radius: 12px; overflow: hidden; box-shadow: 0 0 15px rgba(255,255,255,0.1);">
    
    <!-- Header -->
    <div style="background-color: #000000; padding: 18px; text-align: center; border-bottom: 1px solid #222;">
      <h1 style="margin: 0; font-size: 26px; letter-spacing: 1px;">
        <a href="${FRONTEND_URL}/" target="_blank" style="color: #FFFFFF; text-decoration: none;">Dasho</a>
      </h1>
    </div>

    <!-- Main Content -->
    <div style="padding: 25px; text-align: center; color: #E0E0E0;">
      <h2 style="color: #FFFFFF;">Registration Successful 🎉</h2>
      <p style="font-size: 16px; margin-bottom: 20px; color: #CCCCCC;">
        Hello <strong style="color: #FFFFFF;">${user.name || "Participant"}</strong>,<br/>
        You have been successfully registered for <strong style="color: #FFFFFF;">${eventData.eventTitle}</strong>.
      </p>
      <p style="font-size: 15px; color: #BBBBBB;">
        Please use the attached <strong style="color: #FFFFFF;">QR Code</strong> for event check-in and check-out.
      </p>
      <div style="margin-top: 20px;">
        <img src="${BACKEND_URL}/${qrCodePath}" 
             alt="QR Code" 
             style="width: 180px; height: 180px; border-radius: 8px; border: 2px solid #FFFFFF;" />
      </div>
      <p style="margin-top: 25px; font-size: 14px; color: #888;">
        Thank you for registering!<br/>
        — The Dasho Event Team
      </p>
    </div>

    <!-- Footer -->
    <div style="background-color: #000000; border-top: 1px solid #222; text-align: center; padding: 12px; font-size: 13px; color: #777;">
      <p style="margin: 0;">
        © ${new Date().getFullYear()} <a href="${FRONTEND_URL}/" target="_blank" style="color: #FFFFFF; text-decoration: none;">Dasho</a>
      </p>
    </div>
  </div>
</div>
  `});
    console.log('Email sent successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

export const sendPaymentEmail= async (user,eventData,teamName,paymentLink)=>{
  try{
    console.log(user)
    const response=await axios.post(EMAIL_SERVICE_URL,{
      to:user.email,
      subject:`Payment for ${eventData.eventTitle}`,
      html:`
      <h1>Payment Mail</h1>
      <p>Hi ${user.name},</p>
      <p>Thank you for registering for ${eventData.eventTitle}. Please make the payment of ${eventData.eventFee} to ${eventData.eventBank}.</p>
      <p>Payment Link: <a href="${paymentLink}">${paymentLink}</a></p>
      `
    })
    console.log(response.data)
  }
  catch (e){
    console.log("error",e)

  }
}

export const sendWelcomeEmail=async (members,eventData,teamName)=>{
  try{
    const response=await axios.post(EMAIL_SERVICE_URL,{
      to:members,
      subject:`Welcome to ${eventData.eventTitle}`,
      html:`
      <h1>Welcome ${teamName} to ${eventData.eventTitle}</h1>
      `
    })
  }
  catch{

  }
}