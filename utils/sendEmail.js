const nodemailer = require('nodemailer')

function createTransport() {
  const { EMAIL_USER, EMAIL_PASS } = process.env
  if (!EMAIL_USER || !EMAIL_PASS) {
    // eslint-disable-next-line no-console
    console.warn('EMAIL_USER/EMAIL_PASS missing. Emails will not send.')
    return null
  }
  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user: EMAIL_USER, pass: EMAIL_PASS },
  })
}

function wrapHtml({ title, body }) {
  return `
  <div style="font-family:Inter,Arial,sans-serif;background:#FFFBF5;padding:24px;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:18px;box-shadow:0 12px 30px rgba(28,25,23,0.12);overflow:hidden;">
      <div style="padding:18px 20px;background:linear-gradient(135deg,#F97316,#16A34A);color:#fff;">
        <div style="font-family:'Fredoka One',Arial,sans-serif;font-size:22px;letter-spacing:0.5px;">FOODBRIDGE</div>
        <div style="opacity:0.9;margin-top:4px;font-size:13px;">Connecting Communities, Combating Waste</div>
      </div>
      <div style="padding:22px 20px;">
        <div style="font-size:18px;font-weight:800;color:#1C1917;margin-bottom:10px;">${title}</div>
        ${body}
        <div style="margin-top:18px;font-size:12px;color:#78716C;">If you didn’t request this, you can safely ignore this email.</div>
      </div>
    </div>
  </div>
  `
}

async function sendEmail({ to, subject, html }) {
  const transporter = createTransport()
  if (!transporter) return
  await transporter.sendMail({
    from: `FoodBridge <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
  })
}

function passwordResetOtpTemplate({ otp }) {
  return wrapHtml({
    title: 'Your FoodBridge Password Reset OTP',
    body: `
      <div style="font-size:14px;color:#1C1917;line-height:1.6;">
        Use the OTP below to reset your password. It expires in <b>10 minutes</b>.
      </div>
      <div style="margin-top:14px;padding:16px;border-radius:14px;background:rgba(251,191,36,0.18);text-align:center;">
        <div style="font-size:30px;letter-spacing:6px;font-weight:900;color:#1C1917;">${otp}</div>
      </div>
    `,
  })
}

function donationLiveTemplate({ donation, otp }) {
  return wrapHtml({
    title: 'Your Donation is Live! 🍱',
    body: `
      <div style="font-size:14px;color:#1C1917;line-height:1.6;">
        Donation: <b>${donation.foodName}</b> · ${donation.quantity}<br/>
        Pickup: ${donation.pickupAddress}<br/>
        Expiry: ${new Date(donation.expiryTime).toLocaleString()}
      </div>
      <div style="margin-top:14px;padding:16px;border-radius:14px;background:rgba(249,115,22,0.14);text-align:center;">
        <div style="font-size:13px;color:#78716C;font-weight:700;">Give this OTP to the volunteer at pickup</div>
        <div style="font-size:30px;letter-spacing:6px;font-weight:900;color:#1C1917;">${otp}</div>
      </div>
    `,
  })
}

function acceptorOtpTemplate({ donation, otp }) {
  return wrapHtml({
    title: "Food is on the way! Here's your delivery OTP 🚗",
    body: `
      <div style="font-size:14px;color:#1C1917;line-height:1.6;">
        Donation: <b>${donation.foodName}</b> · ${donation.quantity}<br/>
        Donor pickup: ${donation.pickupAddress}
      </div>
      <div style="margin-top:14px;padding:16px;border-radius:14px;background:rgba(22,163,74,0.14);text-align:center;">
        <div style="font-size:13px;color:#78716C;font-weight:700;">Give this OTP to the volunteer at delivery</div>
        <div style="font-size:30px;letter-spacing:6px;font-weight:900;color:#1C1917;">${otp}</div>
      </div>
    `,
  })
}

function volunteerAssignmentTemplate({ donation, volunteerName, mapLink }) {
  return wrapHtml({
    title: 'New Pickup Assigned to You! 📦',
    body: `
      <div style="font-size:14px;color:#1C1917;line-height:1.6;">
        Hi <b>${volunteerName}</b>, you have a new assignment.<br/><br/>
        Donation: <b>${donation.foodName}</b> · ${donation.quantity}<br/>
        Pickup: ${donation.pickupAddress}<br/>
        ${mapLink ? `Map: <a href="${mapLink}">${mapLink}</a>` : ''}
      </div>
    `,
  })
}

function deliveryCompleteTemplate({ mealsSaved = 1 }) {
  return wrapHtml({
    title: 'Delivery Complete — Thank You! 🎉',
    body: `
      <div style="font-size:14px;color:#1C1917;line-height:1.6;">
        Delivery verified successfully. You helped save approximately <b>${mealsSaved}</b> meal(s) today.
        <br/><br/>Thank you for fighting hunger and waste with FoodBridge.
      </div>
    `,
  })
}

module.exports = {
  sendEmail,
  passwordResetOtpTemplate,
  donationLiveTemplate,
  acceptorOtpTemplate,
  volunteerAssignmentTemplate,
  deliveryCompleteTemplate,
}

