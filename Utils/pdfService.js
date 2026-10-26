import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOGO_PATH = path.join(__dirname, '../assets/logo.png');

/**
 * Generates Life Membership Registration Receipt PDF Buffer
 * EXACT match to the frontend print view (AlumniRegistrationPage.jsx)
 * @param {Object} member - Registered member object
 * @returns {Promise<Buffer>}
 */
function generateRegistrationReceiptPdf(member) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 28,
        info: {
          Title: `GCAAA Registration Receipt - ${member.membershipNo || 'LM'}`,
          Author: 'Govt. College of Architecture Alumni Association',
          Subject: 'Life Membership Application & Acknowledgment Receipt',
        },
      });

      const buffers = [];
      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', (err) => reject(err));

      const fullName = `${member.salutation || 'Mr'} ${member.firstName || ''} ${member.middleName ? member.middleName + ' ' : ''}${member.lastName || ''}`.trim() || member.name || 'Alumnus';
      const passingYear = member.year ? `Batch of ${member.year}` : 'N/A';
      const qualification = member.qualification || (member.qualifications && member.qualifications.length > 0 ? member.qualifications.join(', ') : member.course || 'B.Arch.');
      const specialisation = member.specialisation || 'General Architecture';
      const occupation = member.occupation || 'Selfemployed';
      const organization = member.organization || 'Independent Practice';
      const designation = member.designation || 'Architect';
      const email = member.email || 'N/A';
      const mobile = member.mobile || member.phone || 'N/A';
      const officePhone = member.officeAddress?.phone || member.officePhone || mobile || 'N/A';
      const membershipNo = member.membershipNo || `GCAAA/LM/${member.year || '2026'}/${Math.floor(1000 + Math.random() * 9000)}`;

      const dateStr = new Date().toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });

      // Addresses
      const resStreet = member.residenceAddress?.street || '';
      const resCity = member.residenceAddress?.city || '';
      const resCountry = member.residenceAddress?.country || 'India';
      const resText = [resStreet, resCity, resCountry].filter(Boolean).join(', ') || 'N/A';

      const offStreet = member.officeAddress?.street || '';
      const offCity = member.officeAddress?.city || '';
      const offCountry = member.officeAddress?.country || 'India';
      const offText = [offStreet, offCity, offCountry].filter(Boolean).join(', ') || 'N/A';

      // Payment
      const amountPaid = 'Rs. 1,000/- + applicable GST (Lifetime)';
      const paymentMode = member.paymentDetails?.mode || 'Online';
      const transactionRef = member.paymentDetails?.transactionRef || member.paymentDetails?.chequeNo || 'N/A';
      const paymentProof = member.paymentDetails?.paymentProofName || (member.paymentDetails?.paymentProof ? 'Screenshot Attached \u2713' : 'Screenshot Attached \u2713');
      const applicantSig = member.applicantSignature || `${member.firstName || ''} ${member.lastName || ''}`.trim() || fullName;

      // Coordinate layout
      const boxX = 32;
      const boxY = 32;
      const boxW = 531;
      const boxH = 510;

      // Outer Card Frame
      doc.roundedRect(boxX, boxY, boxW, boxH, 8).lineWidth(1.8).strokeColor('#171717').stroke();

      // --- HEADER SECTION ---
      let textStartX = boxX + 16;
      if (fs.existsSync(LOGO_PATH)) {
        try {
          doc.image(LOGO_PATH, boxX + 14, boxY + 12, { fit: [46, 46] });
          textStartX = boxX + 68;
        } catch (e) {
          console.warn('[PDF] Logo render skipped:', e.message);
        }
      }

      // College Title
      doc.fontSize(10.5).font('Helvetica-Bold').fillColor('#171717').text(
        'Govt. College of Architecture Alumni Association',
        textStartX,
        boxY + 12
      );

      // College Subtitle
      doc.fontSize(7).font('Helvetica').fillColor('#3f3f46').text(
        'Faculty of Architecture, AKTU (formerly GCA Lucknow / GBTU), Tagore Marg, Lucknow \u2013 226007',
        textStartX,
        boxY + 26,
        { width: 280 }
      );

      // Contact Line
      doc.fontSize(7).font('Helvetica-Bold').fillColor('#B70D2B').text(
        'Email: contact.gcaaa@gmail.com | Website: www.gcaalumniassociation.com',
        textStartX,
        boxY + 41
      );

      // Top Right: Official Badge, Date, Ref
      const rightColX = boxX + boxW - 146;
      doc.roundedRect(rightColX, boxY + 10, 132, 14, 2.5).fillColor('#171717').fill();
      doc.fontSize(6.5).font('Helvetica-Bold').fillColor('#ffffff').text(
        'OFFICIAL ENROLLMENT COPY',
        rightColX,
        boxY + 13.5,
        { width: 132, align: 'center', characterSpacing: 0.4 }
      );

      doc.fontSize(7.5).font('Helvetica').fillColor('#3f3f46').text(
        `Date: ${dateStr}`,
        rightColX,
        boxY + 28,
        { width: 132, align: 'right' }
      );

      doc.fontSize(7).font('Helvetica-Bold').fillColor('#71717a').text(
        `Ref: ${membershipNo}`,
        rightColX,
        boxY + 40,
        { width: 132, align: 'right' }
      );

      // Header Bottom Line
      doc.strokeColor('#171717').lineWidth(1.5).moveTo(boxX + 10, boxY + 60).lineTo(boxX + boxW - 10, boxY + 60).stroke();

      // --- TITLE BANNER ---
      const bannerY = boxY + 66;
      doc.roundedRect(boxX + 10, bannerY, boxW - 20, 18, 3).fillColor('#f4f4f5').fill();
      doc.roundedRect(boxX + 10, bannerY, boxW - 20, 18, 3).strokeColor('#d4d4d8').lineWidth(0.8).stroke();
      doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#171717').text(
        'ALUMNI LIFE TIME MEMBERSHIP APPLICATION & ACKNOWLEDGMENT RECEIPT',
        boxX + 10,
        bannerY + 5,
        { width: boxW - 20, align: 'center', characterSpacing: 0.6 }
      );

      // --- SECTION 1: CREDENTIALS ---
      let secY = bannerY + 25;
      doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#171717').text(
        '1. MEMBER PERSONAL & ACADEMIC CREDENTIALS',
        boxX + 10,
        secY
      );
      doc.strokeColor('#d4d4d8').lineWidth(0.8).moveTo(boxX + 10, secY + 10).lineTo(boxX + boxW - 10, secY + 10).stroke();

      const col1X = boxX + 10;
      const col2X = boxX + 266;
      let rowY = secY + 14;
      const rowGap = 13;

      const drawCredRow = (lbl1, val1, lbl2, val2, y) => {
        // Col 1
        doc.fontSize(7).font('Helvetica').fillColor('#71717a').text(lbl1, col1X, y);
        const l1w = doc.widthOfString(lbl1);
        doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#171717').text(val1, col1X + l1w + 3, y, { width: 240 - l1w, ellipsis: true });

        // Col 2
        doc.fontSize(7).font('Helvetica').fillColor('#71717a').text(lbl2, col2X, y);
        const l2w = doc.widthOfString(lbl2);
        doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#171717').text(val2, col2X + l2w + 3, y, { width: 240 - l2w, ellipsis: true });
      };

      drawCredRow('Full Name: ', fullName, 'Passing Out Year: ', passingYear, rowY);
      rowY += rowGap;
      drawCredRow('Qualification: ', qualification, 'Specialisation: ', specialisation, rowY);
      rowY += rowGap;
      drawCredRow('Occupation: ', occupation, 'Organization / Firm: ', organization, rowY);
      rowY += rowGap;
      drawCredRow('Designation: ', designation, 'Email ID: ', email, rowY);
      rowY += rowGap;
      drawCredRow('Contact Phone: ', mobile, 'Office Phone: ', officePhone, rowY);

      // --- SECTION 2: ADDRESSES ---
      secY = rowY + 18;
      doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#171717').text(
        '2. RECORDED COMMUNICATION ADDRESSES',
        boxX + 10,
        secY
      );
      doc.strokeColor('#d4d4d8').lineWidth(0.8).moveTo(boxX + 10, secY + 10).lineTo(boxX + boxW - 10, secY + 10).stroke();

      const addrBoxY = secY + 14;
      const addrBoxW = (boxW - 28) / 2;
      const addrBoxH = 34;

      // Left Address Box
      doc.roundedRect(boxX + 10, addrBoxY, addrBoxW, addrBoxH, 3).fillColor('#fafafa').fill();
      doc.roundedRect(boxX + 10, addrBoxY, addrBoxW, addrBoxH, 3).strokeColor('#e4e4e7').lineWidth(0.8).stroke();
      doc.fontSize(6.5).font('Helvetica-Bold').fillColor('#71717a').text(
        'RESIDENCE ADDRESS:',
        boxX + 16,
        addrBoxY + 5
      );
      doc.fontSize(7).font('Helvetica').fillColor('#171717').text(
        resText,
        boxX + 16,
        addrBoxY + 16,
        { width: addrBoxW - 12 }
      );

      // Right Address Box
      doc.roundedRect(boxX + 18 + addrBoxW, addrBoxY, addrBoxW, addrBoxH, 3).fillColor('#fafafa').fill();
      doc.roundedRect(boxX + 18 + addrBoxW, addrBoxY, addrBoxW, addrBoxH, 3).strokeColor('#e4e4e7').lineWidth(0.8).stroke();
      doc.fontSize(6.5).font('Helvetica-Bold').fillColor('#71717a').text(
        'OFFICE ADDRESS:',
        boxX + 24 + addrBoxW,
        addrBoxY + 5
      );
      doc.fontSize(7).font('Helvetica').fillColor('#171717').text(
        offText,
        boxX + 24 + addrBoxW,
        addrBoxY + 16,
        { width: addrBoxW - 12 }
      );

      // --- SECTION 3: PAYMENT RECORD ---
      secY = addrBoxY + addrBoxH + 10;
      doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#171717').text(
        '3. LIFE MEMBERSHIP CONTRIBUTION & PAYMENT RECORD',
        boxX + 10,
        secY
      );
      doc.strokeColor('#d4d4d8').lineWidth(0.8).moveTo(boxX + 10, secY + 10).lineTo(boxX + boxW - 10, secY + 10).stroke();

      const payBoxY = secY + 14;
      const payBoxH = 34;
      doc.roundedRect(boxX + 10, payBoxY, boxW - 20, payBoxH, 3).fillColor('#fafafa').fill();
      doc.roundedRect(boxX + 10, payBoxY, boxW - 20, payBoxH, 3).strokeColor('#e4e4e7').lineWidth(0.8).stroke();

      const payColW = (boxW - 20) / 4;

      // Col 1
      doc.fontSize(6.5).font('Helvetica').fillColor('#71717a').text('CONTRIBUTION AMOUNT', boxX + 16, payBoxY + 5);
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#171717').text(amountPaid, boxX + 16, payBoxY + 17);

      // Col 2
      doc.fontSize(6.5).font('Helvetica').fillColor('#71717a').text('PAYMENT MODE', boxX + 10 + payColW + 6, payBoxY + 5);
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#171717').text(paymentMode, boxX + 10 + payColW + 6, payBoxY + 17);

      // Col 3
      doc.fontSize(6.5).font('Helvetica').fillColor('#71717a').text('UTR / REF ID', boxX + 10 + payColW * 2 + 6, payBoxY + 5);
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#171717').text(transactionRef, boxX + 10 + payColW * 2 + 6, payBoxY + 17);

      // Col 4
      doc.fontSize(6.5).font('Helvetica').fillColor('#71717a').text('PAYMENT PROOF', boxX + 10 + payColW * 3 + 6, payBoxY + 5);
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#171717').text(paymentProof, boxX + 10 + payColW * 3 + 6, payBoxY + 17);

      // --- DECLARATION ---
      const decY = payBoxY + payBoxH + 8;
      const decH = 24;
      doc.roundedRect(boxX + 10, decY, boxW - 20, decH, 3).fillColor('#fafafa').fill();
      doc.roundedRect(boxX + 10, decY, boxW - 20, decH, 3).strokeColor('#e4e4e7').lineWidth(0.8).stroke();
      doc.fontSize(6.5).font('Helvetica-Oblique').fillColor('#3f3f46').text(
        'Declaration: "Kindly enroll me as a member of GCA Alumni Association. I hereby agree to abide by the rules & regulations of GCAAA. All information provided above is accurate and true to the best of my knowledge as per my academic degree certificate."',
        boxX + 16,
        decY + 4,
        { width: boxW - 32, lineGap: 1.5 }
      );

      // --- SIGNATURES ---
      const sigLineY = decY + decH + 28;
      // Left line
      doc.strokeColor('#a1a1aa').lineWidth(0.8).moveTo(boxX + 14, sigLineY).lineTo(boxX + 180, sigLineY).stroke();
      doc.fontSize(8.5).font('Helvetica-BoldOblique').fillColor('#171717').text(applicantSig, boxX + 14, sigLineY - 11);
      doc.fontSize(6.5).font('Helvetica-Bold').fillColor('#71717a').text('DIGITAL SIGNATURE OF APPLICANT', boxX + 14, sigLineY + 3);

      // Right line
      doc.strokeColor('#a1a1aa').lineWidth(0.8).moveTo(boxX + boxW - 190, sigLineY).lineTo(boxX + boxW - 14, sigLineY).stroke();
      doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#171717').text(
        'Provisionally Registered (Secretariat Seal)',
        boxX + boxW - 190,
        sigLineY - 10,
        { width: 176, align: 'right' }
      );
      doc.fontSize(6.5).font('Helvetica-Bold').fillColor('#71717a').text(
        'FOR GCAAA EXECUTIVE COMMITTEE / TREASURER',
        boxX + boxW - 190,
        sigLineY + 3,
        { width: 176, align: 'right' }
      );

      // --- FOOTER NOTE ---
      const noteY = sigLineY + 20;
      doc.strokeColor('#e4e4e7').lineWidth(0.8).moveTo(boxX + 10, noteY).lineTo(boxX + boxW - 10, noteY).stroke();
      doc.fontSize(6.5).font('Helvetica').fillColor('#71717a').text(
        'Note: Official Life Membership ID & Certificate will be issued upon document verification by the GCAAA Executive Committee.',
        boxX + 10,
        noteY + 4,
        { width: boxW - 20, align: 'center' }
      );
      doc.fontSize(6.5).font('Helvetica-Bold').fillColor('#3f3f46').text(
        'Govt. College of Architecture Alumni Association \u2022 FOAP-AKTU Campus, Lucknow \u2022 contact.gcaaa@gmail.com',
        boxX + 10,
        noteY + 13,
        { width: boxW - 20, align: 'center' }
      );

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Helper to draw photo image buffer or fallback placeholder
 */
function drawPhotoOrPlaceholder(doc, photoData, x, y, w, h, caption) {
  let drawn = false;
  if (photoData && typeof photoData === 'string' && photoData.startsWith('data:image')) {
    try {
      const base64Data = photoData.replace(/^data:image\/\w+;base64,/, '');
      const buf = Buffer.from(base64Data, 'base64');
      doc.image(buf, x, y, { fit: [w, h], align: 'center', valign: 'center' });
      drawn = true;
    } catch {
      drawn = false;
    }
  }

  if (!drawn) {
    doc.roundedRect(x, y, w, h, 2).fillColor('#f4f4f5').fill();
    doc.roundedRect(x, y, w, h, 2).strokeColor('#d4d4d8').lineWidth(0.8).stroke();
    doc.fontSize(5.5).font('Helvetica-Bold').fillColor('#71717a').text(caption, x + 2, y + h / 2 - 3, {
      width: w - 4,
      align: 'center',
    });
  } else {
    doc.roundedRect(x, y, w, h, 2).strokeColor('#d4d4d8').lineWidth(0.8).stroke();
    if (caption) {
      doc.fontSize(5).font('Helvetica-Bold').fillColor('#71717a').text(caption, x, y + h + 2, {
        width: w,
        align: 'center',
      });
    }
  }
}

/**
 * Generates Election Nomination Receipt PDF Buffer
 * EXACT match to the frontend print view (ElectionNominationPage.jsx)
 * @param {Object} nomination - Election nomination object
 * @returns {Promise<Buffer>}
 */
function generateNominationReceiptPdf(nomination) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 28,
        info: {
          Title: `GCAAA Nomination Receipt - ${nomination.nominationId || 'NOM'}`,
          Author: 'Govt. College of Architecture Alumni Association',
          Subject: 'Executive Committee Biennial Election Official Nomination Receipt',
        },
      });

      const buffers = [];
      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', (err) => reject(err));

      const candidateName = nomination.candidate?.fullName || 'Candidate';
      const nominationId = nomination.nominationId || 'GCA-NOM-2026-OFFICIAL';
      const post = (nomination.post || 'GENERAL SECRETARY').toUpperCase();
      const term = nomination.term || '2026 – 2028';
      const candidateMemNo = nomination.candidate?.membershipNo || 'N/A';
      const candidateMobile = nomination.candidate?.mobile || 'N/A';
      const candidateEmail = nomination.candidate?.email || 'N/A';
      const candidateAddress = nomination.candidate?.address || 'N/A';

      const proposerName = nomination.proposer?.fullName || 'N/A';
      const proposerMemNo = nomination.proposer?.membershipNo || 'N/A';
      const proposerMobile = nomination.proposer?.mobile || 'N/A';
      const proposerAddress = nomination.proposer?.address || 'N/A';

      const seconderName = nomination.seconder?.fullName || 'N/A';
      const seconderMemNo = nomination.seconder?.membershipNo || 'N/A';
      const seconderMobile = nomination.seconder?.mobile || 'N/A';
      const seconderAddress = nomination.seconder?.address || 'N/A';

      const dateStr = new Date().toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });

      const boxX = 32;
      const boxY = 32;
      const boxW = 531;
      const boxH = 510;

      // Outer Frame
      doc.roundedRect(boxX, boxY, boxW, boxH, 8).lineWidth(1.8).strokeColor('#171717').stroke();

      // Top Header
      let textStartX = boxX + 16;
      if (fs.existsSync(LOGO_PATH)) {
        try {
          doc.image(LOGO_PATH, boxX + 14, boxY + 12, { fit: [46, 46] });
          textStartX = boxX + 68;
        } catch {
          // ignore
        }
      }

      // Title
      doc.fontSize(10.5).font('Helvetica-Bold').fillColor('#171717').text(
        'Govt. College of Architecture Alumni Association',
        textStartX,
        boxY + 12
      );

      // Subtitle
      doc.fontSize(7).font('Helvetica').fillColor('#3f3f46').text(
        'Faculty of Architecture, AKTU (formerly GCA Lucknow / GBTU), Tagore Marg, Lucknow \u2013 226007',
        textStartX,
        boxY + 26,
        { width: 280 }
      );

      // Contact Line
      doc.fontSize(7).font('Helvetica-Bold').fillColor('#B70D2B').text(
        'Email: contact.gcaaa@gmail.com | Website: www.gcaalumniassociation.com',
        textStartX,
        boxY + 41
      );

      // Top Right: Badge, Date, Ref
      const rightColX = boxX + boxW - 146;
      doc.roundedRect(rightColX, boxY + 10, 132, 14, 2.5).fillColor('#171717').fill();
      doc.fontSize(6.5).font('Helvetica-Bold').fillColor('#ffffff').text(
        'OFFICIAL NOMINATION COPY',
        rightColX,
        boxY + 13.5,
        { width: 132, align: 'center', characterSpacing: 0.4 }
      );

      doc.fontSize(7.5).font('Helvetica').fillColor('#3f3f46').text(
        `Date: ${dateStr}`,
        rightColX,
        boxY + 28,
        { width: 132, align: 'right' }
      );

      doc.fontSize(7).font('Helvetica-Bold').fillColor('#71717a').text(
        `Ref: ${nominationId}`,
        rightColX,
        boxY + 40,
        { width: 132, align: 'right' }
      );

      // Header Bottom Line
      doc.strokeColor('#171717').lineWidth(1.5).moveTo(boxX + 10, boxY + 60).lineTo(boxX + boxW - 10, boxY + 60).stroke();

      // Title Banner
      const bannerY = boxY + 66;
      doc.roundedRect(boxX + 10, bannerY, boxW - 20, 18, 3).fillColor('#f4f4f5').fill();
      doc.roundedRect(boxX + 10, bannerY, boxW - 20, 18, 3).strokeColor('#d4d4d8').lineWidth(0.8).stroke();
      doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#171717').text(
        'EXECUTIVE COMMITTEE BIENNIAL ELECTION (2026 \u2013 2028) \u2022 OFFICIAL NOMINATION RECEIPT',
        boxX + 10,
        bannerY + 5,
        { width: boxW - 20, align: 'center', characterSpacing: 0.5 }
      );

      // Post Contested Bar
      const postBarY = bannerY + 23;
      doc.roundedRect(boxX + 10, postBarY, boxW - 20, 18, 3).fillColor('#fafafa').fill();
      doc.roundedRect(boxX + 10, postBarY, boxW - 20, 18, 3).strokeColor('#e4e4e7').lineWidth(0.8).stroke();

      doc.fontSize(7).font('Helvetica-Bold').fillColor('#71717a').text('POST CONTESTED: ', boxX + 16, postBarY + 5);
      const pcw = doc.widthOfString('POST CONTESTED: ');
      doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#8B0000').text(post, boxX + 16 + pcw + 2, postBarY + 4);

      doc.fontSize(7).font('Helvetica').fillColor('#71717a').text('Term: ', boxX + boxW - 120, postBarY + 5);
      doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#171717').text('2026 \u2013 2028', boxX + boxW - 90, postBarY + 5);

      // Section 1: Candidate Information
      let secY = postBarY + 24;
      doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#171717').text(
        '1. CANDIDATE CREDENTIALS & CONTACT DETAILS',
        boxX + 10,
        secY
      );
      doc.strokeColor('#d4d4d8').lineWidth(0.8).moveTo(boxX + 10, secY + 10).lineTo(boxX + boxW - 10, secY + 10).stroke();

      const col1X = boxX + 10;
      const col2X = boxX + 230;
      let rowY = secY + 14;

      const drawCandRow = (lbl1, val1, lbl2, val2, y) => {
        doc.fontSize(7).font('Helvetica').fillColor('#71717a').text(lbl1, col1X, y);
        const l1w = doc.widthOfString(lbl1);
        doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#171717').text(val1, col1X + l1w + 3, y, { width: 210 - l1w, ellipsis: true });

        if (lbl2) {
          doc.fontSize(7).font('Helvetica').fillColor('#71717a').text(lbl2, col2X, y);
          const l2w = doc.widthOfString(lbl2);
          doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#171717').text(val2, col2X + l2w + 3, y, { width: 210 - l2w, ellipsis: true });
        }
      };

      drawCandRow('Candidate Name: ', candidateName, 'GCAAA Membership No: ', candidateMemNo, rowY);
      rowY += 13;
      drawCandRow('Contact Mobile: ', candidateMobile, 'Email Address: ', candidateEmail, rowY);
      rowY += 13;
      doc.fontSize(7).font('Helvetica').fillColor('#71717a').text('Complete Address: ', col1X, rowY);
      const caw = doc.widthOfString('Complete Address: ');
      doc.fontSize(7).font('Helvetica').fillColor('#171717').text(candidateAddress, col1X + caw + 3, rowY, { width: 420 - caw, ellipsis: true });

      // Candidate Photo (Top right of section 1)
      const candPhotoX = boxX + boxW - 68;
      const candPhotoY = secY + 13;
      drawPhotoOrPlaceholder(doc, nomination.candidate?.photo, candPhotoX, candPhotoY, 54, 44, 'CANDIDATE PHOTO');

      // Section 2: Proposer & Seconder Endorsement
      secY = rowY + 18;
      doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#171717').text(
        '2. ENDORSEMENT BY REGISTERED LIFE MEMBERS',
        boxX + 10,
        secY
      );
      doc.strokeColor('#d4d4d8').lineWidth(0.8).moveTo(boxX + 10, secY + 10).lineTo(boxX + boxW - 10, secY + 10).stroke();

      const endBoxY = secY + 14;
      const endBoxW = (boxW - 28) / 2;
      const endBoxH = 60;

      // Helper for endorsement sub-box
      const drawEndorsementBox = (boxTitle, name, memNo, mobile, address, photo, startX) => {
        doc.roundedRect(startX, endBoxY, endBoxW, endBoxH, 3).fillColor('#fafafa').fill();
        doc.roundedRect(startX, endBoxY, endBoxW, endBoxH, 3).strokeColor('#e4e4e7').lineWidth(0.8).stroke();

        doc.fontSize(6.5).font('Helvetica-Bold').fillColor('#71717a').text(boxTitle, startX + 8, endBoxY + 5);

        let curY = endBoxY + 16;
        const textW = endBoxW - 56;

        const drawMiniRow = (lbl, val) => {
          doc.fontSize(6.5).font('Helvetica').fillColor('#71717a').text(lbl, startX + 8, curY);
          const lw = doc.widthOfString(lbl);
          doc.fontSize(7).font('Helvetica-Bold').fillColor('#171717').text(val, startX + 8 + lw + 2, curY, { width: textW - lw, ellipsis: true });
          curY += 10;
        };

        drawMiniRow('Name: ', name);
        drawMiniRow('Mem No: ', memNo);
        drawMiniRow('Mobile: ', mobile);

        doc.fontSize(6.5).font('Helvetica').fillColor('#71717a').text('Address: ', startX + 8, curY);
        const alw = doc.widthOfString('Address: ');
        doc.fontSize(6.5).font('Helvetica').fillColor('#171717').text(address, startX + 8 + alw + 2, curY, { width: textW - alw, ellipsis: true });

        // Photo thumbnail on right of the sub-box
        const photoX = startX + endBoxW - 42;
        const photoY = endBoxY + 8;
        drawPhotoOrPlaceholder(doc, photo, photoX, photoY, 36, 44, 'PHOTO');
      };

      // Proposer Box
      drawEndorsementBox(
        'PROPOSER PARTICULARS:',
        proposerName,
        proposerMemNo,
        proposerMobile,
        proposerAddress,
        nomination.proposer?.photo,
        boxX + 10
      );

      // Seconder Box
      drawEndorsementBox(
        'SECONDER PARTICULARS:',
        seconderName,
        seconderMemNo,
        seconderMobile,
        seconderAddress,
        nomination.seconder?.photo,
        boxX + 18 + endBoxW
      );

      // Declaration Box
      const decY = endBoxY + endBoxH + 8;
      const decH = 26;
      doc.roundedRect(boxX + 10, decY, boxW - 20, decH, 3).fillColor('#fafafa').fill();
      doc.roundedRect(boxX + 10, decY, boxW - 20, decH, 3).strokeColor('#e4e4e7').lineWidth(0.8).stroke();
      doc.fontSize(6.5).font('Helvetica-Oblique').fillColor('#3f3f46').text(
        'Declaration: "I hereby declare that the information provided in this nomination form is true and correct to the best of my knowledge. I am eligible to contest for the selected post as per the election rules and constitution of GCAAA. I agree to abide by the decision of the Election Returning Officer."',
        boxX + 16,
        decY + 4,
        { width: boxW - 32, lineGap: 1.5 }
      );

      // Signatures
      const sigLineY = decY + decH + 28;
      // Left line
      doc.strokeColor('#a1a1aa').lineWidth(0.8).moveTo(boxX + 14, sigLineY).lineTo(boxX + 180, sigLineY).stroke();
      if (
        nomination.candidate?.signature &&
        typeof nomination.candidate.signature === 'string' &&
        nomination.candidate.signature.startsWith('data:image')
      ) {
        drawPhotoOrPlaceholder(doc, nomination.candidate.signature, boxX + 14, sigLineY - 22, 80, 20, '');
      } else {
        doc.fontSize(8.5).font('Helvetica-BoldOblique').fillColor('#171717').text(candidateName, boxX + 14, sigLineY - 11);
      }
      doc.fontSize(6.5).font('Helvetica-Bold').fillColor('#71717a').text('DIGITAL SIGNATURE OF CANDIDATE', boxX + 14, sigLineY + 3);

      // Right line
      doc.strokeColor('#a1a1aa').lineWidth(0.8).moveTo(boxX + boxW - 190, sigLineY).lineTo(boxX + boxW - 14, sigLineY).stroke();
      doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#171717').text(
        'Returning Officer (Scrutiny & Seal)',
        boxX + boxW - 190,
        sigLineY - 10,
        { width: 176, align: 'right' }
      );
      doc.fontSize(6.5).font('Helvetica-Bold').fillColor('#71717a').text(
        'FOR GCAAA ELECTION COMMITTEE 2026\u20132028',
        boxX + boxW - 190,
        sigLineY + 3,
        { width: 176, align: 'right' }
      );

      // Footer
      const noteY = sigLineY + 20;
      doc.strokeColor('#e4e4e7').lineWidth(0.8).moveTo(boxX + 10, noteY).lineTo(boxX + boxW - 10, noteY).stroke();
      doc.fontSize(6.5).font('Helvetica').fillColor('#71717a').text(
        'Note: This is an official computer-generated nomination submission receipt. Nomination validity is subject to final voter roll scrutiny.',
        boxX + 10,
        noteY + 4,
        { width: boxW - 20, align: 'center' }
      );
      doc.fontSize(6.5).font('Helvetica-Bold').fillColor('#3f3f46').text(
        'Govt. College of Architecture Alumni Association \u2022 FOAP-AKTU Campus, Lucknow \u2022 contact.gcaaa@gmail.com',
        boxX + 10,
        noteY + 13,
        { width: boxW - 20, align: 'center' }
      );

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

export {
  generateRegistrationReceiptPdf,
  generateNominationReceiptPdf,
};

export default {
  generateRegistrationReceiptPdf,
  generateNominationReceiptPdf,
};
