import axios from "axios"

axios.post("https://7feej0sxm3.execute-api.eu-north-1.amazonaws.com/default/mail_sender",{
    "to": "mohanavamsi14@gmail.com",
    "subject": "test",
    "html": `<div style="font-family: Arial, sans-serif; background-color: #000000; padding: 20px; color: #FFFFFF;">
  <div style="max-width: 600px; margin: auto; background: #111111; border-radius: 12px; overflow: hidden; box-shadow: 0 0 15px rgba(255,255,255,0.1);">
    
    <!-- Header -->
    <div style="background-color: #000000; padding: 18px; text-align: center; border-bottom: 1px solid #222;">
      <h1 style="margin: 0; font-size: 26px; letter-spacing: 1px;">
        <a href="https://dashoo-p.vercel.app/" target="_blank" style="color: #FFFFFF; text-decoration: none;">Dasho</a>
      </h1>
    </div>

    <!-- Main Content -->
    <div style="padding: 25px; text-align: center; color: #E0E0E0;">
      <h2 style="color: #FFFFFF;">Registration Successful 🎉</h2>
      <p style="font-size: 16px; margin-bottom: 20px; color: #CCCCCC;">
        Hello <strong style="color: #FFFFFF;">${ "Participant"
    }</strong>,<br/>
        You have been successfully registered for <strong style="color: #FFFFFF;">${ "ewf"
    }</strong>.
      </p>
      <p style="font-size: 15px; color: #BBBBBB;">
        Please use the attached <strong style="color: #FFFFFF;">QR Code</strong> for event check-in and check-out.
      </p>
      <div style="margin-top: 20px;">
        <img src="https://dasho-backend.onrender.com/qrcode.png" 
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
        © ${new Date().getFullYear()
    } <a href="https://dashoo-p.vercel.app/" target="_blank" style="color: #FFFFFF; text-decoration: none;">Dasho</a>
      </p>
    </div>
  </div>
</div>
`})
.then(response => {
    console.log('Email sent successfully:', response.data);
})