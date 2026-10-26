import BatchAlumni from '../Models/BatchAlumni.js';

/**
 * @desc    Get all batch alumni with cohort tabs, batch year filtering, search & pagination
 * @route   GET /api/batch-alumni
 * @access  Public
 */
export const getBatchAlumni = async (req, res) => {
  try {
    const {
      search = '',
      cohort = 'all',
      year,
      status,
      page = 1,
      limit = 50,
      sortBy = 'sno',
      order = 'asc',
    } = req.query;

    const filter = {};

    // Cohort filter
    // if (cohort && cohort !== 'total') {
    //   filter.cohort = cohort;
    // }

    console.log("Cohort filter value:", cohort);

    if(cohort === 'b-arch'){
      filter.cohort = "b-arch"
    }
    if(cohort === 'd-arch'){
      filter.cohort = "d-arch"
    }
    if(cohort === 'm-arch'){
      filter.cohort = "m-arch"
    }
    if(cohort === 'murp'){
      filter.cohort = "murp"
    }
    if(cohort === 'miend'){
      filter.cohort = "miend"
    }
    if(cohort === 'mind'){
      filter.cohort = "mind"
    }
    

    // Year / Batch filter
    if (year && year !== 'ALL') {
      filter.year = year;
    }

    // Status filter
    if (status) {
      filter.status = status;
    }

    // Search query
    if (search.trim()) {
      const sanitized = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(sanitized, 'i');
      filter.$or = [
        { name: regex },
        { membershipNo: regex },
        { email: regex },
        { mobile: regex },
        { batchNo: regex },
        { year: regex },
      ];
    }

    const total = await BatchAlumni.countDocuments(filter);

    // Sorting
    const sortOrder = order === 'desc' ? -1 : 1;
    const sortOptions = {};
    if (sortBy === 'year') {
      sortOptions.year = sortOrder;
      sortOptions.sno = 1;
    } else if (sortBy === 'name') {
      sortOptions.name = sortOrder;
    } else {
      sortOptions.sno = sortOrder;
    }

    let query = BatchAlumni.find(filter).sort(sortOptions);
    // let query = BatchAlumni.find(filter).sort(sortOptions);
    // let abhay = await BatchAlumni.find(filter).sort(sortOptions);
    // console.log("Query for batch alumni:", abhay.length, "records found");
    // let abhay = await BatchAlumni.countDocuments();
    // console.log("total data is---->", abhay)

    const isAll = limit === 'ALL' || limit === 'all' || Number(limit) === 0;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = isAll ? 0 : Math.max(1, parseInt(limit, 10) || 50);

    if (!isAll) {
      query = query.skip((pageNum - 1) * limitNum).limit(limitNum);
    }

    const data = await query.lean();

    const dataWithDisplaySno = data.map((item, idx) => ({
      ...item,
      displaySno: item.sno || (isAll ? idx + 1 : (pageNum - 1) * limitNum + idx + 1),
    }));

    const totalPages = isAll ? 1 : Math.ceil(total / limitNum) || 1;

    return res.status(200).json({
      success: true,
      total,
      count: dataWithDisplaySno.length,
      totalPages,
      currentPage: pageNum,
      isAll,
      data: dataWithDisplaySno,
    });
  } catch (error) {
    console.error('Error fetching batch alumni:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve batch alumni records',
      error: error.message,
    });
  }
};

/**
 * @desc    Get summary metrics for cohorts and batches
 * @route   GET /api/batch-alumni/stats
 * @access  Public
 */
export const getBatchAlumniStats = async (req, res) => {
  try {
    const { cohort } = req.query;
    const cohortFilter = cohort && cohort !== 'total' ? { cohort } : {};

    const total = await BatchAlumni.countDocuments(cohortFilter);
    const paid = await BatchAlumni.countDocuments({ ...cohortFilter, status: 'Paid' });
    const pending = await BatchAlumni.countDocuments({ ...cohortFilter, status: 'Pending' });

    // Breakdown per cohort
    const cohortBreakdown = await BatchAlumni.aggregate([
      { $group: { _id: '$cohort', count: { $sum: 1 } } },
    ]);

    // Breakdown per year for active cohort
    const yearBreakdown = await BatchAlumni.aggregate([
      { $match: cohortFilter },
      { $group: { _id: '$year', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    const distinctYears = yearBreakdown.map((y) => y._id).filter(Boolean);

    return res.status(200).json({
      success: true,
      stats: {
        total,
        paid,
        pending,
        cohorts: cohortBreakdown,
        years: yearBreakdown,
        distinctYears,
        totalBatches: distinctYears.length,
      },
    });
  } catch (error) {
    console.error('Error in getBatchAlumniStats:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve stats',
      error: error.message,
    });
  }
};

/**
 * @desc    Get single batch alumnus by ID
 * @route   GET /api/batch-alumni/:id
 * @access  Public
 */
export const getBatchAlumnusById = async (req, res) => {
  try {
    const record = await BatchAlumni.findById(req.params.id);
    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Batch alumni record not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: record,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch batch record',
      error: error.message,
    });
  }
};

/**
 * @desc    Create new batch alumnus
 * @route   POST /api/batch-alumni
 * @access  Admin
 */
export const createBatchAlumnus = async (req, res) => {
  try {
    const { name, year, cohort = 'all', course, membershipNo, email, mobile, status = 'Paid' } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Name is required' });
    }
    if (!year || !String(year).trim()) {
      return res.status(400).json({ success: false, message: 'Graduation year is required' });
    }

    const countInCohort = await BatchAlumni.countDocuments({ cohort });
    const newSno = countInCohort + 1;

    const newRecord = await BatchAlumni.create({
      sno: req.body.sno || newSno,
      name: name.trim(),
      year: String(year).trim(),
      cohort,
      course: course || (cohort === 'all' ? 'Bachelor of Architecture & Foundation' : cohort.toUpperCase()),
      membershipNo: membershipNo ? membershipNo.trim().toUpperCase() : '',
      email: email ? email.trim() : '',
      mobile: mobile ? String(mobile).trim() : '',
      status: status || 'Paid',
    });

    return res.status(201).json({
      success: true,
      message: 'Batch alumnus record created successfully',
      data: newRecord,
    });
  } catch (error) {
    console.error('Error creating batch record:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create batch record',
      error: error.message,
    });
  }
};

/**
 * @desc    Update batch alumnus
 * @route   PUT /api/batch-alumni/:id
 * @access  Admin
 */
export const updateBatchAlumnus = async (req, res) => {
  try {
    const { name, year, cohort, course, membershipNo, email, mobile, status, sno } = req.body;

    const record = await BatchAlumni.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, message: 'Record not found' });
    }

    if (name) record.name = name.trim();
    if (year !== undefined) record.year = String(year).trim();
    if (cohort !== undefined) record.cohort = cohort;
    if (course !== undefined) record.course = course;
    if (membershipNo !== undefined) record.membershipNo = membershipNo.trim().toUpperCase();
    if (email !== undefined) record.email = email.trim();
    if (mobile !== undefined) record.mobile = String(mobile).trim();
    if (status !== undefined) record.status = status;
    if (sno !== undefined) record.sno = Number(sno);

    await record.save();

    return res.status(200).json({
      success: true,
      message: 'Batch alumnus record updated successfully',
      data: record,
    });
  } catch (error) {
    console.error('Error updating batch record:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update batch record',
      error: error.message,
    });
  }
};

/**
 * @desc    Delete batch alumnus
 * @route   DELETE /api/batch-alumni/:id
 * @access  Admin
 */
export const deleteBatchAlumnus = async (req, res) => {
  try {
    const record = await BatchAlumni.findByIdAndDelete(req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, message: 'Record not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'Batch alumnus record deleted successfully',
      data: { id: req.params.id },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to delete record',
      error: error.message,
    });
  }
};

export default {
  getBatchAlumni,
  getBatchAlumniStats,
  getBatchAlumnusById,
  createBatchAlumnus,
  updateBatchAlumnus,
  deleteBatchAlumnus,
};
