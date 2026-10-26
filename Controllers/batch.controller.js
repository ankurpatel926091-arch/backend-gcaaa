import Batch from "../Models/batch.model.js";

// ✅ Create Batch
export const createBatch = async (req, res) => {
  try {
    const { name, year, course, cohort, isPaid } = req.body;

    if (!name || !year || !course || !cohort) {
      return res.status(400).json({
        success: false,
        message: 'All fields (name, year, course, cohort) are required',
      });
    }

    // (Optional) Year validation: Agar aap chahte hain ki year sirf number ho string ke andar
    // Agar aap custom text allow karna chahte hain (jaise "2023-2025"), toh isko hata dein.
    if (isNaN(year)) {
       return res.status(400).json({
        success: false,
        message: 'Year must be a valid number or numeric string',
      });
    }

    const batch = await Batch.create({ 
      name, 
      year, // Yeh ab schema ke hisaab se String ban jayega
      course, 
      cohort, 
      isPaid: isPaid || false 
    });

    return res.status(201).json({
      success: true,
      message: 'Batch created successfully',
      data: batch,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to create batch',
      error: error.message,
    });
  }
};

// ✅ Get All Batches (With Search, Filter, Pagination & Stats)
export const getAllBatches = async (req, res) => {
  try {
    const {
      search,
      cohort,
      batch,
      course,
      isPaid,
      page = 1,
      limit = 50,
      sortBy = 'createdAt',
      order = 'desc',
    } = req.query;

    let filter = {};

    // Global Search
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { year: { $regex: search, $options: 'i' } },
        { course: { $regex: search, $options: 'i' } },
        { cohort: { $regex: search, $options: 'i' } },
      ];
    }

    // Exact Filter by Cohort (dropdown "All Courses" -> DB cohort field)
    if (cohort && cohort !== 'all') {
      filter.cohort = cohort;
    }

    // Exact Filter by Course (agar kabhi course dropdown use ho)
    if (course && course !== 'all') {
      filter.course = course;
    }

    // Exact Filter by Batch/Year (dropdown "All Batches" -> DB year field)
    // ✅ FIX: year DB me Number hai, isliye Number me convert karo
    if (batch && batch !== 'all') {
      // const yearNum = Number(batch);
      // if (!isNaN(yearNum)) {
      //   filter.year = yearNum;
      // }
      filter.year = batch; // Ab year DB me String hai, isliye direct string match karenge
    }

    // isPaid filter
    if (isPaid !== undefined && isPaid !== 'all') {
      filter.isPaid = isPaid === 'true';
    }

    // Pagination
    const pageNumber = parseInt(page, 10) || 1;
    const limitNumber = parseInt(limit, 10) || 50;
    const skip = (pageNumber - 1) * limitNumber;

    // Main data query
    const sortFields = ['name', 'year', 'course', 'cohort', 'createdAt'];
    const sortField = sortFields.includes(sortBy) ? sortBy : 'createdAt';
    const sortOrder = order === 'asc' ? 1 : -1;

    const batches = await Batch.find(filter)
      .sort({ [sortField]: sortOrder, _id: 1 })
      .skip(skip)
      .limit(limitNumber);

    // Total matching records (pagination ke liye)
    const totalBatches = await Batch.countDocuments(filter);

    // ✅ STATS: Same filter apply karke counts nikaalo (sirf current page ka nahi)
    const paidCount = await Batch.countDocuments({ ...filter, isPaid: true });
    const pendingCount = await Batch.countDocuments({ ...filter, isPaid: false });

    return res.status(200).json({
      success: true,
      count: batches.length,
      total: totalBatches,
      page: pageNumber,
      totalPages: Math.ceil(totalBatches / limitNumber) || 1,
      stats: {
        total: totalBatches,
        paid: paidCount,
        pending: pendingCount,
      },
      data: batches,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch batches',
      error: error.message,
    });
  }
};

// ✅ Get Single Batch by ID
export const getBatchById = async (req, res) => {
  try {
    const batch = await Batch.findById(req.params.id);

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: batch,
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid batch ID',
      });
    }
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch batch',
      error: error.message,
    });
  }
};

// ✅ Update Batch
export const updateBatch = async (req, res) => {
  try {
    const { name, year, course, cohort, isPaid } = req.body;

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    
    // Year update karte time validation
    if (year !== undefined) {
      if (isNaN(year)) {
        return res.status(400).json({
          success: false,
          message: 'Year must be a valid number or numeric string',
        });
      }
      updateData.year = year;
    }

    if (course !== undefined) updateData.course = course;
    if (cohort !== undefined) updateData.cohort = cohort;
    if (isPaid !== undefined) updateData.isPaid = isPaid;

    const batch = await Batch.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Batch updated successfully',
      data: batch,
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid batch ID',
      });
    }
    return res.status(500).json({
      success: false,
      message: 'Failed to update batch',
      error: error.message,
    });
  }
};

// ✅ Delete Batch
export const deleteBatch = async (req, res) => {
  try {
    const batch = await Batch.findByIdAndDelete(req.params.id);

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Batch deleted successfully',
      data: batch,
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid batch ID',
      });
    }
    return res.status(500).json({
      success: false,
      message: 'Failed to delete batch',
      error: error.message,
    });
  }
};

// ✅ Get Dropdown Options (Unique Years & Cohorts)
export const getFilterOptions = async (req, res) => {
  try {
    const [years, cohortCounts, total] = await Promise.all([
      Batch.distinct('year'),
      Batch.aggregate([
        { $group: { _id: '$cohort', count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      Batch.countDocuments(),
    ]);

    years.sort((a, b) => String(b).localeCompare(String(a), undefined, { numeric: true }));

    return res.status(200).json({
      success: true,
      data: {
        years,
        cohorts: cohortCounts.map(({ _id }) => _id).filter(Boolean),
        cohortCounts,
        total,
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch filter options',
      error: error.message,
    });
  }
};