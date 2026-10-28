import RegisteredMember from '../Models/RegisteredMember.js';
import BatchAlumni from '../Models/BatchAlumni.js';
import { uploadToCloudinary } from '../Config/cloudinary.js';
import { sendRegistrationReceiptEmail } from '../Utils/emailService.js';

const normalizeMemberName = (name) =>
  String(name || '')
    .toLowerCase()
    .replace(/^(?:ar(?:chitect)?|mr|mrs|ms|dr|late)\.?\s+/i, '')
    .replace(/[^a-z0-9]/g, '');

const inferYearFromMembershipNo = (membershipNo) => {
  const value = String(membershipNo || '').trim().toUpperCase();
  const undergrad = value.match(/^U(\d{2})\d+$/);
  if (undergrad) return String(1984 + Number(undergrad[1]));

  const postgraduate = value.match(/^M([1-4])(\d{2})\d+$/);
  if (postgraduate) {
    const baseYear = { 1: 2014, 2: 2020, 3: 2021, 4: 2022 }[postgraduate[1]];
    return String(baseYear + Number(postgraduate[2]));
  }

  return '';
};

const buildRegisteredMemberFilter = async ({
  search = '',
  cohort,
  course,
  year,
  status,
  view,
  source,
}) => {
  const filter = {};

  // 🔍 Search
  if (search.trim()) {
    const sanitized = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(sanitized, 'i');
    filter.$or = [
      { name: regex },
      { membershipNo: regex },
      { firstName: regex },
      { lastName: regex },
      { email: regex },
      { mobile: regex },
    ];
  }

  // ✅ COHORT direct match (query se aaye to)
  if (cohort && cohort !== 'all') {
    filter.cohort = cohort;
  }

  // ✅ COURSE query -> DB me cohort se DIRECT match (no regex)
  if (course && course !== 'all') {
    filter.cohort = course; // agar dono aaye to course override karega
  }

  // 🎓 Year filter (existing logic — no change)
  if (year) {
    const batchRecords = await BatchAlumni.find({ year: String(year) })
      .select('membershipNo name')
      .lean();
    const masterDirectoryMatches = [];
    const membershipNumbers = batchRecords
      .map((record) => record.membershipNo?.trim().toUpperCase())
      .filter(Boolean);
    if (membershipNumbers.length > 0) {
      masterDirectoryMatches.push({ membershipNo: { $in: membershipNumbers } });
    }

    batchRecords.forEach((record) => {
      if (!record.name) return;
      const nameTokens = record.name
        .replace(/^(?:ar(?:chitect)?|mr|mrs|ms|dr|late)\.?\s+/i, '')
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map((token) => token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
      if (nameTokens.length > 0) {
        masterDirectoryMatches.push({
          name: new RegExp(`^\\s*(?:(?:ar(?:chitect)?|mr|mrs|ms|dr|late)\\.?\\s+)?${nameTokens.join('[\\s.,-]+')}\\s*$`, 'i'),
        });
      }
    });

    const yearConditions = [{ year: String(year) }];
    if (masterDirectoryMatches.length > 0) {
      yearConditions.push({
        $and: [
          { $or: [{ year: { $exists: false } }, { year: null }, { year: '' }] },
          { $or: masterDirectoryMatches },
        ],
      });
    }
    filter.$and = [...(filter.$and || []), { $or: yearConditions }];
  }

  // 📊 Status filter (existing logic — no change)
  if (view === 'public') {
    filter.status = { $in: ['Paid', 'Verified', 'Active', 'In Memoriam'] };
  } else if (status) {
    if (status === 'Paid') {
      filter.status = { $in: ['Paid', 'Verified', 'Active', 'In Memoriam'] };
    } else if (status === 'Pending') {
      filter.$and = [
        ...(filter.$and || []),
        {
          $or: [
            { status: 'Pending' },
            { status: { $exists: false } },
          ],
        },
      ];
    } else {
      filter.status = status;
    }
  }

  // 🏷️ Source filter (website, admin panel, excel)
  if (source) {
    filter.source = String(source).trim().toLowerCase();
  }

  return filter;
};

/**
 * @desc    Get all registered members with search, pagination & filtering
 * @route   GET /api/registered-members
 * @access  Public
 */
export const getRegisteredMembers = async (req, res) => {
  console.log("get member before try start------")
  try {
    const {
      page = 1,
      limit = 150,
      sortBy = 'createdAt',
      order = 'desc',
      year,
    } = req.query;
    console.log("get member after try start------")
    console.log("req.query", req.query)

    const filter = await buildRegisteredMemberFilter(req.query);
    console.log("filter", filter)

    // Determine pagination
    const isAll = limit === 'ALL' || limit === 'all' || Number(limit) === 0;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = isAll ? 0 : Math.max(1, parseInt(limit, 10) || 150);

    // Sorting: default to latest registered first (descending)
    const sortOrder = order === 'asc' ? 1 : -1;
    const sortOptions = {};
    if (sortBy === 'createdAt') {
      sortOptions.createdAt = sortOrder;
      sortOptions.sno = sortOrder;
    } else if (sortBy === 'sno') {
      sortOptions.sno = sortOrder;
    } else {
      sortOptions[sortBy] = sortOrder;
    }

    // Execute query
    const total = await RegisteredMember.countDocuments(filter);

    let query = RegisteredMember.find(filter).sort(sortOptions);

    // If public directory view, select strictly safe public display fields
    if (req.query.view === 'public') {
      query = query.select('sno name membershipNo year cohort course status createdAt photo');
    } else {
      // Exclude heavy base64 payment proof from list queries to keep API responses ultra-fast (<50ms)
      query = query.select('-paymentDetails.paymentProof');
    }

    if (!isAll) {
      query = query.skip((pageNum - 1) * limitNum).limit(limitNum);
    }

    const members = await query.lean();
    const membersMissingYear = members.filter((member) => !member.year && (member.membershipNo || member.name));
    if (membersMissingYear.length > 0) {
      const matchConditions = [];
      const membershipNumbers = membersMissingYear
        .map((member) => member.membershipNo?.trim().toUpperCase())
        .filter(Boolean);
      if (membershipNumbers.length > 0) {
        matchConditions.push({ membershipNo: { $in: membershipNumbers } });
      }

      const names = [...new Set(membersMissingYear.map((member) => member.name).filter(Boolean))];
      names.forEach((name) => {
        const nameTokens = name
          .replace(/^(?:ar(?:chitect)?|mr|mrs|ms|dr|late)\.?\s+/i, '')
          .trim()
          .split(/\s+/)
          .filter(Boolean)
          .map((token) => token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
        if (nameTokens.length > 0) {
          matchConditions.push({
            name: new RegExp(`^\\s*(?:(?:ar(?:chitect)?|mr|mrs|ms|dr|late)\\.?\\s+)?${nameTokens.join('[\\s.,-]+')}\\s*$`, 'i'),
          });
        }
      });

      const batchRecordFilter = year
        ? { year: String(year), $or: matchConditions }
        : { $or: matchConditions };
      const batchRecords = await BatchAlumni.find(batchRecordFilter)
        .select('membershipNo name year')
        .lean();
      const yearByMembershipNo = new Map(
        batchRecords
          .filter((record) => record.membershipNo)
          .map((record) => [record.membershipNo.trim().toUpperCase(), record.year])
      );
      const yearsByName = new Map();
      batchRecords.forEach((record) => {
        const nameKey = normalizeMemberName(record.name);
        if (!nameKey || !record.year) return;
        const years = yearsByName.get(nameKey) || new Set();
        years.add(record.year);
        yearsByName.set(nameKey, years);
      });

      members.forEach((member) => {
        if (!member.year && member.membershipNo) {
          member.year = yearByMembershipNo.get(member.membershipNo.trim().toUpperCase()) || '';
        }
        if (!member.year && member.name) {
          const years = yearsByName.get(normalizeMemberName(member.name));
          if (years?.size === 1) member.year = [...years][0];
        }
        if (!member.year) {
          member.year = inferYearFromMembershipNo(member.membershipNo);
        }
      });
    }

    // Map sequential sno if not stored
    const dataWithSno = members.map((m, index) => ({
      ...m,
      displaySno: m.sno || (isAll ? index + 1 : (pageNum - 1) * limitNum + index + 1),
    }));

    const totalPages = isAll ? 1 : Math.ceil(total / limitNum) || 1;

    return res.status(200).json({
      success: true,
      total,
      count: dataWithSno.length,
      totalPages,
      currentPage: pageNum,
      isAll,
      data: dataWithSno,
    });
    console.log("get member after try end------")
  } catch (error) {

    console.error('Error fetching registered members:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch registered members',
      error: error.message,
    });
  }
  console.log("get member after catch end------")
};

/**
 * @desc    Get dashboard metrics & statistics for members
 * @route   GET /api/registered-members/stats
 * @access  Public / Admin
 */
export const getMemberStats = async (req, res) => {
  try {
    const filter = await buildRegisteredMemberFilter(req.query);
    const courseOptions = ['all', 'b-arch', 'd-arch', 'm-arch', 'murp', 'miend', 'mind'];
    const [total, verified, deceased, cohorts, courseCounts] = await Promise.all([
      RegisteredMember.countDocuments(filter),
      RegisteredMember.countDocuments({
        ...filter,
        status: { $in: ['Verified', 'Active', 'Paid'] },
      }),
      RegisteredMember.countDocuments({ ...filter, status: 'In Memoriam' }),
      RegisteredMember.aggregate([
        { $match: filter },
        { $group: { _id: '$cohort', count: { $sum: 1 } } },
      ]),
      Promise.all(courseOptions.map(async (course) => {
        const courseFilter = await buildRegisteredMemberFilter({ ...req.query, course });
        return {
          course,
          count: await RegisteredMember.countDocuments(courseFilter),
        };
      })),
    ]);

    return res.status(200).json({
      success: true,
      stats: {
        total,
        verified,
        deceased,
        cohorts,
        courseCounts,
      },
    });
  } catch (error) {
    console.error('Error fetching member stats:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to calculate member statistics',
      error: error.message,
    });
  }
};

/**
 * @desc    Get single member by ID
 * @route   GET /api/registered-members/:id
 * @access  Public
 */
export const getMemberById = async (req, res) => {
  try {
    const member = await RegisteredMember.findOne({
      _id: req.params.id,
      isDeleted: { $ne: true },
    });
    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Member not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: member,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve member details',
      error: error.message,
    });
  }
};

/**
 * @desc    Create new registered member
 * @route   POST /api/registered-members
 * @access  Admin
 */
export const createMember = async (req, res) => {
  try {
    const { name, membershipNo, year, cohort, course, email, mobile, status } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Name is required',
      });
    }

    let cleanMemNo = membershipNo ? membershipNo.trim().toUpperCase() : '';
    if (!cleanMemNo) {
      cleanMemNo = await generateStandardMembershipNo(year);
    }

    // Check if membership number already exists
    const existing = await RegisteredMember.findOne({ membershipNo: cleanMemNo });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: `Membership No ${cleanMemNo} already exists in records`,
      });
    }

    // Auto calculate sno if not given
    const totalCount = await RegisteredMember.countDocuments();
    const newSno = totalCount + 1;

    const newMember = await RegisteredMember.create({
      sno: req.body.sno || newSno,
      name: name.trim(),
      membershipNo: cleanMemNo,
      year: year ? String(year).trim() : '',
      cohort: cohort ? String(cohort).trim() : 'all',
      course: course || 'Bachelor of Architecture',
      email: email ? email.trim().toLowerCase() : '',
      mobile: mobile ? String(mobile).trim() : '',
      status: status || 'Active',
      source: req.body.source || 'admin panel',
    });

    return res.status(201).json({
      success: true,
      message: 'Member registered successfully',
      data: newMember,
    });
  } catch (error) {
    console.error('Error creating member:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create member record',
      error: error.message,
    });
  }
};

/**
 * @desc    Update existing member record
 * @route   PUT /api/registered-members/:id
 * @access  Admin
 */
export const updateMember = async (req, res) => {
  try {
    const { name, membershipNo, year, cohort, course, email, mobile, status, sno } = req.body;

    const member = await RegisteredMember.findById(req.params.id);
    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Member not found',
      });
    }

    if (membershipNo) {
      const cleanMemNo = membershipNo.trim().toUpperCase();
      // Check if new membershipNo is taken by another member
      if (cleanMemNo !== member.membershipNo) {
        const existing = await RegisteredMember.findOne({ membershipNo: cleanMemNo });
        if (existing) {
          return res.status(409).json({
            success: false,
            message: `Membership No ${cleanMemNo} is already in use by another record`,
          });
        }
        member.membershipNo = cleanMemNo;
      }
    }

    if (name) member.name = name.trim();
    if (year !== undefined) member.year = String(year).trim();
    if (cohort !== undefined) member.cohort = cohort;
    if (course !== undefined) member.course = course;
    if (email !== undefined) member.email = email.trim().toLowerCase();
    if (mobile !== undefined) member.mobile = String(mobile).trim();
    if (status !== undefined) member.status = status;
    if (sno !== undefined) member.sno = Number(sno);

    await member.save();

    return res.status(200).json({
      success: true,
      message: 'Member updated successfully',
      data: member,
    });
  } catch (error) {
    console.error('Error updating member:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update member record',
      error: error.message,
    });
  }
};

/**
 * @desc    Delete member record
 * @route   DELETE /api/registered-members/:id
 * @access  Admin
 */
export const deleteMember = async (req, res) => {
  try {
    const member = await RegisteredMember.findByIdAndUpdate(
      req.params.id,
      { isDeleted: true, deletedAt: new Date() },
      { new: true }
    );
    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Member record not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Member record soft-deleted successfully',
      data: { id: req.params.id },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to delete member record',
      error: error.message,
    });
  }
};

/**
 * @desc    Bulk seed or import member records
 * @route   POST /api/registered-members/bulk-seed
 * @access  Admin
 */
export const bulkSeedMembers = async (req, res) => {
  try {
    const { members = [] } = req.body;

    if (!Array.isArray(members) || members.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'An array of member objects is required for bulk import',
      });
    }

    const operations = members.map((m, index) => {
      const cleanMemNo = (m.membershipNo || `GCA${m.year || 2026}${101 + index}`).trim().toUpperCase();
      return {
        updateOne: {
          filter: { membershipNo: cleanMemNo },
          update: {
            $set: {
              sno: m.sno || index + 1,
              name: m.name ? m.name.trim() : 'Unknown Alumnus',
              membershipNo: cleanMemNo,
              year: m.year ? String(m.year).trim() : '',
              cohort: m.cohort || 'all',
              course: m.course || 'Bachelor of Architecture',
              email: m.email || '',
              mobile: m.mobile || '',
              status: m.status || 'Active',
              source: m.source || 'excel',
            },
          },
          upsert: true,
        },
      };
    });

    const result = await RegisteredMember.bulkWrite(operations, { ordered: false });

    return res.status(200).json({
      success: true,
      message: `Bulk sync completed successfully`,
      result: {
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount,
        upsertedCount: result.upsertedCount,
      },
    });
  } catch (error) {
    console.error('Error during bulk member sync:', error);
    return res.status(500).json({
      success: false,
      message: 'Bulk member synchronization failed',
      error: error.message,
    });
  }
};

/**
 * Helper to generate official standardized membership number
 * Matches official GCAA coding scheme:
 * - Undergraduate B.Arch: U<batch><seq> (e.g. U01001, U42001)
 * - Diploma/Foundation (Prior to 1985): D01<seq> (e.g. D01001)
 * - M.Arch: M1<batch><seq> (e.g. M101001)
 * - MURP: M2<batch><seq> (e.g. M201001)
 * - MIEND: M3<batch><seq> (e.g. M301001)
 * - MIND: M4<batch><seq> (e.g. M401001)
 */
async function generateStandardMembershipNo(passingYear, course = '') {
  const yearStr = String(passingYear || new Date().getFullYear()).trim();
  const yearMatch = yearStr.match(/\b(19\d\d|20\d\d)\b/) || yearStr.match(/\d{4}/);
  const yearCode = yearMatch ? parseInt(yearMatch[0], 10) : new Date().getFullYear();

  let prefix = 'U01';
  const c = String(course).toLowerCase();

  if (c.includes('interior') || c.includes('mind')) {
    const batch = Math.max(1, yearCode - 2023 + 1);
    prefix = `M4${String(batch).padStart(2, '0')}`;
  } else if (c.includes('environmental') || c.includes('miend')) {
    const batch = Math.max(1, yearCode - 2022 + 1);
    prefix = `M3${String(batch).padStart(2, '0')}`;
  } else if (c.includes('urban') || c.includes('murp')) {
    const batch = Math.max(1, yearCode - 2021 + 1);
    prefix = `M2${String(batch).padStart(2, '0')}`;
  } else if (c.includes('master') || c.includes('m.arch') || c.includes('m-arch')) {
    const batch = Math.max(1, yearCode - 2015 + 1);
    prefix = `M1${String(batch).padStart(2, '0')}`;
  } else if (yearCode < 1985) {
    prefix = 'D01';
  } else {
    const batch = Math.max(1, yearCode - 1985 + 1);
    prefix = `U${String(batch).padStart(2, '0')}`;
  }

  // Find all existing records starting with this prefix
  const existing = await RegisteredMember.find({
    membershipNo: new RegExp(`^${prefix}`, 'i'),
  }).select('membershipNo').lean();

  let maxSeq = 0;
  for (const m of existing) {
    const rawNo = String(m.membershipNo || '');
    const suffixStr = rawNo.replace(new RegExp(`^${prefix}`, 'i'), '');
    const num = parseInt(suffixStr, 10);
    if (!isNaN(num) && num > maxSeq) {
      maxSeq = num;
    }
  }

  const nextSeq = maxSeq + 1;
  let candidate = `${prefix}${String(nextSeq).padStart(3, '0')}`;

  let counter = 0;
  while (await RegisteredMember.findOne({ membershipNo: candidate })) {
    counter++;
    candidate = `${prefix}${String(nextSeq + counter).padStart(3, '0')}`;
  }

  return candidate;
}

export { generateStandardMembershipNo };

/**
 * @desc    Submit alumni registration from public website
 * @route   POST /api/registered-members/register
 * @access  Public
 */
export const registerAlumni = async (req, res) => {
  try {
    const {
      salutation = 'Ar.',
      firstName,
      middleName = '',
      lastName,
      surName,
      qualifications,
      specialisation = '',
      passingYear,
      occupation = 'Selfemployed',
      organization = '',
      designation = '',
      email,
      officeStreet = '',
      officeCity = '',
      officeCountry = 'India',
      officePhone = '',
      sameAsOffice = false,
      residenceStreet = '',
      residenceCity = '',
      residenceCountry = 'India',
      residencePhone = '',
      paymentMode = 'Online',
      amount = 1000,
      chequeNo = '',
      drawnOnBank = '',
      chequeDate = '',
      paymentProofPreview = '',
      paymentProofName = '',
      photoPreview = '',
      applicantSignature = '',
    } = req.body;

    const actualLastName = lastName || surName || '';

    // Validate required fields
    if (!firstName || !firstName.trim()) {
      return res.status(400).json({ success: false, message: 'First Name is required' });
    }
    if (!actualLastName || !actualLastName.trim()) {
      return res.status(400).json({ success: false, message: 'Last Name is required' });
    }
    if (!passingYear || !String(passingYear).trim()) {
      return res.status(400).json({ success: false, message: 'Graduation / Passing Out Year is required' });
    }
    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, message: 'Valid Email is required' });
    }

    const cleanFirstName = firstName.trim();
    const cleanMiddleName = (middleName || '').trim();
    const cleanLastName = actualLastName.trim();
    const cleanPassingYear = String(passingYear).trim();
    const cleanEmail = email.trim().toLowerCase();
    const primaryPhone = sameAsOffice ? (officePhone || residencePhone) : (residencePhone || officePhone);

    const fullName = `${salutation ? salutation + ' ' : ''}${cleanFirstName} ${cleanMiddleName ? cleanMiddleName + ' ' : ''}${cleanLastName}`.replace(/\s+/g, ' ').trim();

    // Cohort calculation helper
    const numYear = parseInt(cleanPassingYear, 10);
    let cohort = 'all';
    if (!isNaN(numYear)) {
      if (numYear < 1980) cohort = '1970s';
      else if (numYear < 1990) cohort = '1980s';
      else if (numYear < 2000) cohort = '1990s';
      else if (numYear < 2010) cohort = '2000s';
      else if (numYear < 2020) cohort = '2010s';
      else cohort = '2020s';
    }

    // Calculate S.No
    const totalCount = await RegisteredMember.countDocuments();
    const newSno = totalCount + 1;

    // Generate official standardized membership number matching legacy records (e.g. U42001, M101001)
    const membershipNo = await generateStandardMembershipNo(cleanPassingYear, (qualifications && qualifications.length > 0) ? qualifications[0] : 'Bachelor of Architecture');

    // Upload files to Cloudinary in parallel (secure CDN links)
    let uploadedPaymentProofUrl = '';
    let uploadedPhotoUrl = '';

    const uploadPromises = [];

    if (paymentProofPreview && typeof paymentProofPreview === 'string' && paymentProofPreview.trim()) {
      uploadPromises.push(
        uploadToCloudinary(paymentProofPreview, 'gcaaa/payment_proofs')
          .then((url) => {
            uploadedPaymentProofUrl = url || paymentProofPreview;
          })
          .catch((err) => {
            console.warn('Payment proof upload warning:', err.message);
            uploadedPaymentProofUrl = paymentProofPreview;
          })
      );
    }

    if (photoPreview && typeof photoPreview === 'string' && photoPreview.trim()) {
      uploadPromises.push(
        uploadToCloudinary(photoPreview, 'gcaaa/photos')
          .then((url) => {
            uploadedPhotoUrl = url || photoPreview;
          })
          .catch((err) => {
            console.warn('Photo upload warning:', err.message);
            uploadedPhotoUrl = photoPreview;
          })
      );
    }

    if (uploadPromises.length > 0) {
      await Promise.all(uploadPromises);
    }

    const newMember = await RegisteredMember.create({
      sno: newSno,
      name: fullName,
      membershipNo,
      year: cleanPassingYear,
      cohort,
      course: (qualifications && qualifications.length > 0) ? qualifications.join(', ') : 'Bachelor of Architecture',
      email: cleanEmail,
      mobile: String(primaryPhone || '').trim(),
      salutation: salutation || 'Ar.',
      firstName: cleanFirstName,
      middleName: cleanMiddleName,
      lastName: cleanLastName,
      qualifications: qualifications || ['B.Arch.'],
      specialisation: specialisation || '',
      occupation: occupation || 'Selfemployed',
      organization: organization || '',
      designation: designation || '',
      officeAddress: {
        street: officeStreet || '',
        city: officeCity || '',
        country: officeCountry || 'India',
        phone: officePhone || '',
      },
      residenceAddress: {
        street: sameAsOffice ? (officeStreet || '') : (residenceStreet || ''),
        city: sameAsOffice ? (officeCity || '') : (residenceCity || ''),
        country: sameAsOffice ? (officeCountry || 'India') : (residenceCountry || 'India'),
        phone: sameAsOffice ? (officePhone || '') : (residencePhone || ''),
      },
      paymentDetails: {
        mode: paymentMode || 'Online',
        amount: Number(amount) || 1000,
        chequeNo: chequeNo || '',
        drawnOnBank: drawnOnBank || '',
        chequeDate: chequeDate || '',
        transactionRef: chequeNo || '',
        paymentProof: uploadedPaymentProofUrl || '',
        paymentProofName: paymentProofName || '',
      },
      photo: uploadedPhotoUrl || '',
      applicantSignature: applicantSignature || fullName,
      status: 'Pending',
      source: 'website',
    });

    // Send receipt email to the registered alumnus
    try {
      console.log(`[registeredMemberController] 🚀 Sending registration receipt email to: ${newMember.email}`);
      const emailResult = await sendRegistrationReceiptEmail(newMember);
      console.log('[registeredMemberController] 📩 Email dispatch result:', emailResult);
    } catch (emailErr) {
      console.error('[registeredMemberController] ❌ Error dispatching registration receipt email:', emailErr.message);
    }

    return res.status(201).json({
      success: true,
      message: 'Life Membership application submitted successfully!',
      data: newMember,
    });
  } catch (error) {
    console.error('Error in registerAlumni:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to process registration',
      error: error.message,
    });
  }
};

/**
 * @desc    Verify membership number existence and details
 * @route   GET /api/registered-members/verify/:membershipNo
 * @access  Public
 */
export const verifyMembershipNumber = async (req, res) => {
  try {
    const { membershipNo } = req.params;
    if (!membershipNo || !membershipNo.trim()) {
      return res.status(400).json({ success: false, message: 'Membership number is required' });
    }
    const cleanNo = membershipNo.trim();
    const member = await RegisteredMember.findOne({
      membershipNo: { $regex: new RegExp(`^${cleanNo}$`, 'i') },
    }).select('name membershipNo year course status email mobile');

    if (!member) {
      return res.status(404).json({
        success: false,
        exists: false,
        message: `Membership No. '${cleanNo}' was not found in registered members database.`,
      });
    }

    return res.status(200).json({
      success: true,
      exists: true,
      data: {
        name: member.name,
        membershipNo: member.membershipNo,
        year: member.year,
        course: member.course,
        status: member.status,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to verify membership number',
      error: error.message,
    });
  }
};

export default {
  getRegisteredMembers,
  getMemberStats,
  getMemberById,
  createMember,
  updateMember,
  deleteMember,
  bulkSeedMembers,
  generateStandardMembershipNo,
  registerAlumni,
  verifyMembershipNumber,
};
