import { FRONTEND_URL, BACKEND_URL } from "../config.js";

const HEADER_TEMPLATE = `
<div style="font-family: Arial, sans-serif; background-color: #000000; padding: 20px; color: #FFFFFF;">
  <div style="max-width: 600px; margin: auto; background: #111111; border-radius: 12px; overflow: hidden; box-shadow: 0 0 15px rgba(255,255,255,0.1);">
    
    <!-- Header -->
    <div style="background-color: #000000; padding: 18px; text-align: center; border-bottom: 1px solid #222;">
      <h1 style="margin: 0; font-size: 26px; letter-spacing: 1px;">
        <a href="${FRONTEND_URL}/" target="_blank" style="color: #FFFFFF; text-decoration: none;">Dasho</a>
      </h1>
    </div>
`;

const FOOTER_TEMPLATE = `
    <!-- Footer -->
    <div style="background-color: #000000; border-top: 1px solid #222; text-align: center; padding: 12px; font-size: 13px; color: #777;">
      <p style="margin: 0;">
        © ${new Date().getFullYear()} <a href="${FRONTEND_URL}/" target="_blank" style="color: #FFFFFF; text-decoration: none;">Dasho</a>
      </p>
    </div>
  </div>
</div>
`;

export const getRegistrationEmailTemplate = (user, eventData, qrCodePath) => {
  return `
    ${HEADER_TEMPLATE}
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
    ${FOOTER_TEMPLATE}
  `;
};

export const getPaymentEmailTemplate = (user, eventData, teamName, paymentLink) => {
  return `
    ${HEADER_TEMPLATE}
    <!-- Main Content -->
    <div style="padding: 25px; text-align: center; color: #E0E0E0;">
      <h2 style="color: #FFFFFF;">Payment Required 💳</h2>
      <p style="font-size: 16px; margin-bottom: 20px; color: #CCCCCC;">
        Hello <strong style="color: #FFFFFF;">${user.name || "Participant"}</strong>,<br/>
        Thank you for registering for <strong style="color: #FFFFFF;">${eventData.eventTitle}</strong>.
      </p>
      <p style="font-size: 15px; color: #BBBBBB;">
        To complete your registration for team <strong style="color: #FFFFFF;">${teamName}</strong>, please make a payment of <strong style="color: #FFFFFF;">${eventData.eventFee}</strong>.
      </p>
       <div style="margin-top: 25px; margin-bottom: 25px;">
        <a href="${paymentLink}" style="background-color: #FFFFFF; color: #000000; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">Pay Now</a>
      </div>
      <p style="font-size: 14px; color: #888;">
        Or use this link: <a href="${paymentLink}" style="color: #AAAAAA;">${paymentLink}</a>
      </p>
      <p style="margin-top: 25px; font-size: 14px; color: #888;">
        — The Dasho Event Team
      </p>
    </div>
    ${FOOTER_TEMPLATE}
  `;
};

export const getWelcomeEmailTemplate = (members, eventData, teamName) => {
  return `
    ${HEADER_TEMPLATE}
    <!-- Main Content -->
    <div style="padding: 25px; text-align: center; color: #E0E0E0;">
      <h2 style="color: #FFFFFF;">Welcome, ${teamName}! 🚀</h2>
       <p style="font-size: 16px; margin-bottom: 20px; color: #CCCCCC;">
        We are excited to have you onboard for <strong style="color: #FFFFFF;">${eventData.eventTitle}</strong>.
      </p>
      <p style="font-size: 15px; color: #BBBBBB;">
        Get ready for an amazing experience!
      </p>
      <p style="margin-top: 25px; font-size: 14px; color: #888;">
        See you there!<br/>
        — The Dasho Event Team
      </p>
    </div>
    ${FOOTER_TEMPLATE}
  `;
};
