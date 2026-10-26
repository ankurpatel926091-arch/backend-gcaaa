import nodemailer from 'nodemailer';
import {
  generateRegistrationReceiptPdf,
  generateNominationReceiptPdf,
} from './pdfService.js';

/**
 * Creates and returns Nodemailer transporter using credentials from .env
 */
const createTransporter = () => {
  const user = (process.env.EMAIL_USER || '').trim();
  const pass = (process.env.EMAIL_PASSWORD || process.env.EMAIL_PASS || '').trim();

  if (!user || !pass) {
    console.warn('[EmailService] ⚠️ EMAIL_USER or EMAIL_PASSWORD not configured. Emails will be skipped.');
    return null;
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user,
      pass,
    },
  });
};

/**
 * Send Life Membership Registration Receipt PDF Email with a professional English Thank You note
 * @param {Object} member - Newly registered member document/object
 */
const sendRegistrationReceiptEmail = async (member) => {
  try {
    const recipientEmail = member.email ? member.email.trim() : null;
    if (!recipientEmail) {
      console.warn('[EmailService] No recipient email found for member registration.');
      return { success: false, reason: 'No email provided' };
    }

    const transporter = createTransporter();
    if (!transporter) {
      return { success: false, reason: 'Transporter not configured' };
    }

    const fullName = `${member.salutation || 'Mr'} ${member.firstName || ''} ${member.middleName ? member.middleName + ' ' : ''}${member.lastName || ''}`.trim() || member.name || 'Alumnus';
    const membershipNo = member.membershipNo || 'GCAAA-LM';
    const cleanRefFilename = String(membershipNo).replace(/[^a-zA-Z0-9_-]/g, '_');

    // Generate exact match PDF
    const pdfBuffer = await generateRegistrationReceiptPdf(member);

    // Clean, professional English Thank You email body
    const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Thank You for Registering - GCAAA</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px 12px; color: #1e293b; }
        .card { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 28px 24px; box-shadow: 0 4px 14px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; }
        .header { border-bottom: 2px solid #800018; padding-bottom: 14px; margin-bottom: 18px; }
        .title { font-size: 16px; font-weight: 800; color: #800018; text-transform: uppercase; margin: 0; font-family: Georgia, serif; }
        .sub { font-size: 11px; color: #64748b; margin: 4px 0 0; }
        .salutation { font-size: 15px; font-weight: 700; color: #0f172a; margin-bottom: 12px; }
        .text { font-size: 13.5px; line-height: 1.6; color: #334155; margin-bottom: 16px; }
        .attach-box { background-color: #f1f5f9; border: 1px dashed #cbd5e1; border-radius: 8px; padding: 12px 16px; margin: 18px 0; font-size: 13px; color: #0f172a; }
        .footer { font-size: 11.5px; color: #64748b; margin-top: 24px; border-top: 1px solid #f1f5f9; padding-top: 14px; line-height: 1.5; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <h1 class="title">Govt. College of Architecture Alumni Association</h1>
          <p class="sub">Faculty of Architecture, AKTU Campus, Tagore Marg, Lucknow – 226007</p>
        </div>

        <div class="salutation">Dear ${fullName},</div>
        
        <p class="text">
          Thank you for registering with the <strong>Govt. College of Architecture Alumni Association (GCAAA)</strong>. We are delighted to welcome you to our distinguished alumni network.
        </p>

        <p class="text">
          Your application for <strong>Life Membership</strong> along with your payment details has been received and recorded successfully. Your official <strong>Life Membership Application &amp; Acknowledgment Receipt</strong> is attached to this email as a PDF document.
        </p>

        <p class="text">
          The Life Membership contribution is <strong>₹1,000/- + applicable GST</strong>.
        </p>

        <div class="attach-box">
          📎 <strong>Attached Document:</strong> GCAAA-Registration-Receipt-${cleanRefFilename}.pdf
        </div>

        <p class="text" style="font-size: 12.5px; color: #64748b; margin-bottom: 0;">
          Please download and preserve the attached PDF receipt for your permanent records.
        </p>

        <div class="footer">
          <strong style="color: #0f172a;">GCAAA Alumni Secretariat</strong><br/>
          Govt. College of Architecture Alumni Association<br/>
          Tagore Marg, Lucknow – 226007, Uttar Pradesh<br/>
          Email: contact.gcaaa@gmail.com | Website: www.gcaalumniassociation.com
        </div>
      </div>
    </body>
    </html>
    `;

    const textContent = `
Dear ${fullName},

Thank you for registering with the Govt. College of Architecture Alumni Association (GCAAA). We are delighted to welcome you to our distinguished alumni network.

Your application for Life Membership along with your payment details has been received and recorded successfully. Your official Life Membership Application & Acknowledgment Receipt has been attached to this email as a PDF document (GCAAA-Registration-Receipt-${cleanRefFilename}.pdf).

The Life Membership contribution is ₹1,000/- + applicable GST.

Please download and preserve the attached PDF receipt for your permanent records.

Warm regards,
GCAAA Alumni Secretariat
Govt. College of Architecture Alumni Association
Tagore Marg, Lucknow – 226007, Uttar Pradesh
Email: contact.gcaaa@gmail.com
    `.trim();

    const mailOptions = {
      from: `"GCAAA Alumni Secretariat" <${process.env.EMAIL_USER.trim()}>`,
      to: recipientEmail,
      subject: `Official GCAAA Life Membership Receipt - ${fullName}`,
      text: textContent,
      html: htmlContent,
      attachments: [
        {
          filename: `GCAAA-Registration-Receipt-${cleanRefFilename}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[EmailService] ✅ Registration receipt PDF email sent to ${recipientEmail}: MessageId: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('[EmailService] ❌ Error sending registration receipt email:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Send Election Nomination Receipt PDF Email with a professional English Thank You note
 * @param {Object} nomination - Newly created nomination document
 */
const sendElectionNominationReceiptEmail = async (nomination) => {
  try {
    const candidateEmail = nomination.candidate?.email ? nomination.candidate.email.trim() : null;
    if (!candidateEmail) {
      console.warn('[EmailService] No candidate email provided for election nomination receipt.');
      return { success: false, reason: 'No email provided' };
    }

    const transporter = createTransporter();
    if (!transporter) {
      return { success: false, reason: 'Transporter not configured' };
    }

    const candidateName = nomination.candidate?.fullName || 'Candidate';
    const nominationId = nomination.nominationId || 'N/A';
    const post = (nomination.post || 'Executive Committee Member').toUpperCase();
    const term = nomination.term || '2026 – 2028';
    const cleanNomFilename = String(nominationId).replace(/[^a-zA-Z0-9_-]/g, '_');

    // Generate exact match PDF
    const pdfBuffer = await generateNominationReceiptPdf(nomination);

    // Clean, professional English Thank You email body
    const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Thank You for Submitting Nomination - GCAAA Election</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px 12px; color: #1e293b; }
        .card { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 28px 24px; box-shadow: 0 4px 14px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; }
        .header { border-bottom: 2px solid #1e3a8a; padding-bottom: 14px; margin-bottom: 18px; }
        .title { font-size: 16px; font-weight: 800; color: #1e3a8a; text-transform: uppercase; margin: 0; font-family: Georgia, serif; }
        .sub { font-size: 11px; color: #64748b; margin: 4px 0 0; }
        .salutation { font-size: 15px; font-weight: 700; color: #0f172a; margin-bottom: 12px; }
        .text { font-size: 13.5px; line-height: 1.6; color: #334155; margin-bottom: 16px; }
        .attach-box { background-color: #eff6ff; border: 1px dashed #bfdbfe; border-radius: 8px; padding: 12px 16px; margin: 18px 0; font-size: 13px; color: #1e40af; }
        .footer { font-size: 11.5px; color: #64748b; margin-top: 24px; border-top: 1px solid #f1f5f9; padding-top: 14px; line-height: 1.5; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <h1 class="title">GCAAA Election Commission 2026</h1>
          <p class="sub">Govt. College of Architecture Alumni Association, Lucknow</p>
        </div>

        <div class="salutation">Dear ${candidateName},</div>
        
        <p class="text">
          Thank you for submitting your nomination form for the upcoming <strong>GCAAA Executive Committee Biennial Elections (Term ${term})</strong> for the post of <strong>${post}</strong>.
        </p>

        <p class="text">
          Your nomination application has been recorded successfully under Reference ID <strong>${nominationId}</strong>. Your official <strong>Nomination Submission Receipt</strong> is attached to this email as a PDF document.
        </p>

        <div class="attach-box">
          📎 <strong>Attached Document:</strong> GCAAA-Nomination-Receipt-${cleanNomFilename}.pdf
        </div>

        <p class="text" style="font-size: 12.5px; color: #64748b; margin-bottom: 0;">
          Please download and preserve the attached PDF receipt for all future election communications and scrutiny proceedings.
        </p>

        <div class="footer">
          <strong style="color: #0f172a;">Office of the Returning Officer</strong><br/>
          GCAAA Election Commission 2026<br/>
          Govt. College of Architecture Alumni Association, Tagore Marg, Lucknow<br/>
          Email: contact.gcaaa@gmail.com | Website: www.gcaalumniassociation.com
        </div>
      </div>
    </body>
    </html>
    `;

    const textContent = `
Dear ${candidateName},

Thank you for submitting your nomination form for the upcoming GCAAA Executive Committee Biennial Elections (Term ${term}) for the post of ${post}.

Your nomination application has been recorded successfully under Reference ID ${nominationId}. Your official Nomination Submission Receipt has been attached to this email as a PDF document (GCAAA-Nomination-Receipt-${cleanNomFilename}.pdf).

Please download and preserve the attached PDF receipt for all future election communications and scrutiny proceedings.

Regards,
Office of the Returning Officer
GCAAA Election Commission 2026
Govt. College of Architecture Alumni Association, Lucknow
Email: contact.gcaaa@gmail.com
    `.trim();

    const mailOptions = {
      from: `"GCAAA Election Commission" <${process.env.EMAIL_USER.trim()}>`,
      to: candidateEmail,
      subject: `Official GCAAA Election Nomination Receipt - ${candidateName} (${post})`,
      text: textContent,
      html: htmlContent,
      attachments: [
        {
          filename: `GCAAA-Nomination-Receipt-${cleanNomFilename}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[EmailService] ✅ Election nomination receipt PDF email sent to ${candidateEmail}: MessageId: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('[EmailService] ❌ Error sending election nomination receipt email:', error.message);
    return { success: false, error: error.message };
  }
};

export {
  sendRegistrationReceiptEmail,
  sendElectionNominationReceiptEmail,
};

export default {
  sendRegistrationReceiptEmail,
  sendElectionNominationReceiptEmail,
};
