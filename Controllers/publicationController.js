import mongoose from 'mongoose';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import PublicationModel from '../Models/PublicationModel.js';
import { uploadToCloudinary, uploadPdfToCloudinary, cloudinary } from '../Config/cloudinary.js';

// Multer memory storage for direct PDF uploads
const storage = multer.memoryStorage();
export const pdfUploadMiddleware = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files (.pdf) are allowed.'));
    }
  },
}).single('pdf');

const formatPublication = (pub) => {
  const plain = pub && typeof pub.toObject === 'function' ? pub.toObject() : pub;
  const id = plain._id ? plain._id.toString() : plain.id;
  return {
    ...plain,
    id,
    _id: id,
  };
};

/**
 * Public: Get all published publications for website (with backend filter support)
 */
export const getPublishedPublications = async (req, res) => {
  try {
    const { year, edition, id } = req.query;

    // Fetch all published records to compute metrics and dynamic filter tabs
    const allPublished = await PublicationModel.find({ isPublished: { $ne: false } })
      .sort({ sortOrder: 1, year: -1, createdAt: -1 })
      .lean();

    const formattedAll = allPublished.map(formatPublication);

    // Compute dynamic summary metrics
    const totalPages = formattedAll.reduce((sum, p) => sum + (Number(p.pages) || 0), 0);
    const years = formattedAll.map((p) => parseInt(p.year, 10)).filter((y) => !isNaN(y)).sort((a, b) => a - b);
    const yearSpan = years.length > 0 ? `${years[0]} – ${years[years.length - 1]}` : '2013 – 2025';

    // Dynamic tabs for frontend filter
    const filterTabs = [
      { key: 'all', label: 'All Editions', count: formattedAll.length },
      ...formattedAll.map((p) => ({
        key: p.year || p.id,
        year: p.year,
        id: p.id,
        label: p.edition || `${p.year} Edition`,
        sectionNumber: p.sectionNumber || '01',
      })),
    ];

    // Backend MongoDB query filtering
    const query = { isPublished: { $ne: false } };
    if (id && id !== 'all' && mongoose.isValidObjectId(id)) {
      query._id = id;
    } else if (year && year !== 'all') {
      query.year = year;
    } else if (edition && edition !== 'all') {
      query.$or = [
        { edition: new RegExp(edition, 'i') },
        { year: edition },
      ];
    }

    const publications = await PublicationModel.find(query)
      .sort({ sortOrder: 1, year: -1, createdAt: -1 })
      .lean();

    const formatted = publications.map(formatPublication);

    return res.status(200).json({
      success: true,
      count: formatted.length,
      data: formatted,
      filterTabs,
      metrics: {
        totalPublications: formattedAll.length,
        totalPages,
        yearSpan,
      },
    });
  } catch (error) {
    console.error('Error fetching publications:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch publications.',
      error: error.message,
    });
  }
};

/**
 * Admin: Get all publications with stats and search
 */
export const getAdminPublications = async (req, res) => {
  try {
    const { search, page, limit } = req.query;
    const query = {};

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [
        { title: regex },
        { tagline: regex },
        { edition: regex },
        { description: regex },
        { publisher: regex },
        { year: regex },
      ];
    }

    const total = await PublicationModel.countDocuments(query);
    const all = await PublicationModel.find().select('pages year isPublished').lean();

    const totalPagesCount = all.reduce((sum, p) => sum + (Number(p.pages) || 0), 0);
    const years = all.map((p) => parseInt(p.year, 10)).filter((y) => !isNaN(y)).sort((a, b) => a - b);
    const yearRange = years.length > 0 ? `${years[0]} – ${years[years.length - 1]}` : '2013 – 2025';

    let pubQuery = PublicationModel.find(query).sort({ sortOrder: 1, createdAt: -1 });

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    if (pageNum > 0 && limitNum > 0) {
      const skip = (pageNum - 1) * limitNum;
      pubQuery = pubQuery.skip(skip).limit(limitNum);
    }

    const publications = await pubQuery.lean();

    return res.status(200).json({
      success: true,
      data: publications.map(formatPublication),
      stats: {
        totalPublications: all.length,
        totalDocumentedPages: totalPagesCount,
        yearRange,
        publishedCount: all.filter((p) => p.isPublished !== false).length,
      },
      pagination: {
        total,
        page: pageNum || 1,
        limit: limitNum || total,
        totalPages: limitNum > 0 ? Math.ceil(total / limitNum) : 1,
      },
    });
  } catch (error) {
    console.error('Error fetching admin publications:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch admin publications.',
      error: error.message,
    });
  }
};

/**
 * Admin: Get single publication by ID
 */
export const getPublicationById = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid publication ID.' });
  }

  try {
    const pub = await PublicationModel.findById(req.params.id).lean();
    if (!pub) {
      return res.status(404).json({ success: false, message: 'Publication not found.' });
    }

    return res.status(200).json({
      success: true,
      data: formatPublication(pub),
    });
  } catch (error) {
    console.error('Error fetching publication by ID:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch publication.',
      error: error.message,
    });
  }
};

// Helper to automatically count pages in a PDF buffer
export const countPdfPages = (buffer) => {
  if (!buffer) return 0;
  try {
    const content = buffer.toString('binary');
    const countMatches = [...content.matchAll(/\/Type\s*\/Pages[^>]*\/Count\s+(\d+)/g)];
    if (countMatches.length > 0) return Math.max(...countMatches.map((m) => parseInt(m[1], 10)));
    const altMatches = [...content.matchAll(/\/Count\s+(\d+)[^>]*\/Type\s*\/Pages/g)];
    if (altMatches.length > 0) return Math.max(...altMatches.map((m) => parseInt(m[1], 10)));
    const pageMatches = content.match(/\/Type\s*\/Page\b/g);
    return pageMatches ? pageMatches.length : 0;
  } catch (err) {
    return 0;
  }
};

/**
 * Admin: Dedicated PDF Upload (Saves locally for instant viewing + uploads to Cloudinary)
 */
export const uploadPublicationPdf = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No PDF file was provided.' });
    }

    const safeName = (req.file.originalname || 'publication_document')
      .replace(/\.pdf$/i, '')
      .replace(/[^a-zA-Z0-9_-]/g, '_');

    const uniqueFilename = `${Date.now()}_${safeName}.pdf`;
    const detectedPages = countPdfPages(req.file.buffer);
    const sizeMb = (req.file.size / (1024 * 1024)).toFixed(1);

    // 1. Save local copies so browser can open/view PDF with 200 OK
    try {
      const localBackendDir = path.join(process.cwd(), 'uploads', 'publications');
      if (!fs.existsSync(localBackendDir)) fs.mkdirSync(localBackendDir, { recursive: true });
      fs.writeFileSync(path.join(localBackendDir, uniqueFilename), req.file.buffer);

      const frontendPubDir = path.join(process.cwd(), '..', 'GCAAA-Frotend-', 'public', 'publications');
      if (!fs.existsSync(frontendPubDir)) fs.mkdirSync(frontendPubDir, { recursive: true });
      fs.writeFileSync(path.join(frontendPubDir, uniqueFilename), req.file.buffer);
    } catch (fsErr) {
      console.warn('Local PDF save warning:', fsErr.message);
    }

    // 2. Upload to Cloudinary for cloud backup
    let cloudResult = null;
    try {
      const uploadStream = () =>
        new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            {
              folder: 'gcaaa/publications/pdfs',
              resource_type: 'auto',
              pages: true,
              public_id: `${Date.now()}_${safeName}`,
            },
            (err, result) => {
              if (err) reject(err);
              else resolve(result);
            }
          );
          stream.end(req.file.buffer);
        });

      cloudResult = await uploadStream();
    } catch (cloudErr) {
      console.warn('Cloudinary upload warning:', cloudErr.message);
    }

    const finalPages = detectedPages || (cloudResult && cloudResult.pages) || 0;
    const finalUrl = `/publications/${uniqueFilename}`;

    return res.status(200).json({
      success: true,
      message: 'PDF file successfully uploaded and ready for viewing.',
      pdfUrl: finalUrl,
      cloudUrl: cloudResult?.secure_url || '',
      filename: req.file.originalname,
      fileSize: `${sizeMb} MB`,
      pages: finalPages,
    });
  } catch (error) {
    console.error('Error uploading PDF file:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to upload PDF file.',
      error: error.message,
    });
  }
};

/**
 * Stream or view PDF directly (avoids Cloudinary 401 blocks)
 */
export const streamPublicationPdf = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).send('Invalid publication ID');
    }

    const pub = await PublicationModel.findById(id).lean();
    if (!pub || !pub.pdfUrl) {
      return res.status(404).send('Publication or PDF document not found.');
    }

    const filename = pub.downloadFilename || `${(pub.title || 'publication').replace(/\s+/g, '_')}.pdf`;

    // Check if filename in uploads
    const cleanUrl = pub.pdfUrl.replace(/\\/g, '/');
    const baseName = path.basename(cleanUrl);

    const candidates = [
      path.join(process.cwd(), 'uploads', 'publications', baseName),
      path.join(process.cwd(), '..', 'GCAAA-Frotend-', 'public', 'publications', baseName),
      path.join(process.cwd(), '..', 'GCAAA-Frotend-', 'public', cleanUrl.replace(/^\//, '')),
    ];

    for (const filePath of candidates) {
      if (fs.existsSync(filePath)) {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
        return res.sendFile(path.resolve(filePath));
      }
    }

    // Cloudinary signed streaming
    if (pub.pdfUrl.includes('cloudinary.com')) {
      const publicId = pub.pdfUrl.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[^.]+)?$/)?.[1];
      if (publicId) {
        const signedUrl = cloudinary.utils.private_download_url(publicId, 'pdf', {
          resource_type: 'image',
          type: 'upload',
          expires_at: Math.floor(Date.now() / 1000) + 7200,
        });

        const resp = await fetch(signedUrl);
        if (resp.ok) {
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
          const arrayBuffer = await resp.arrayBuffer();
          return res.send(Buffer.from(arrayBuffer));
        }
      }
    }

    return res.redirect(pub.pdfUrl);
  } catch (error) {
    console.error('Error streaming PDF:', error);
    return res.status(500).send('Error delivering PDF document.');
  }
};

/**
 * Admin: Create a new publication
 */
export const createPublication = async (req, res) => {
  try {
    const body = req.body;
    if (!body || typeof body !== 'object') {
      return res.status(400).json({ success: false, message: 'A JSON object is required.' });
    }

    if (!body.title || !body.title.trim()) {
      return res.status(400).json({ success: false, message: 'Publication title is required.' });
    }

    // Process cover image upload to Cloudinary
    let coverImgUrl = body.coverImg || '';
    if (coverImgUrl && (coverImgUrl.startsWith('data:image') || !coverImgUrl.startsWith('http'))) {
      const cloudUrl = await uploadToCloudinary(coverImgUrl, 'gcaaa/publications');
      if (cloudUrl) {
        coverImgUrl = cloudUrl;
      }
    }

    // Process PDF upload if sent as base64 data URI
    let pdfUrl = (body.pdfUrl || '').trim();
    if (pdfUrl && (pdfUrl.startsWith('data:') || !pdfUrl.startsWith('http'))) {
      const cloudPdf = await uploadPdfToCloudinary(pdfUrl, 'gcaaa/publications/pdfs');
      if (cloudPdf) {
        pdfUrl = cloudPdf;
      }
    }

    // Parse highlights if string
    let highlights = body.highlights || [];
    if (typeof highlights === 'string') {
      highlights = highlights.split('\n').map((h) => h.trim()).filter(Boolean);
    }

    // Parse sectionsCovered if string
    let sectionsCovered = body.sectionsCovered || [];
    if (typeof sectionsCovered === 'string') {
      try {
        sectionsCovered = JSON.parse(sectionsCovered);
      } catch {
        sectionsCovered = [];
      }
    }

    const pubData = {
      title: body.title.trim(),
      tagline: (body.tagline || '').trim(),
      edition: (body.edition || '').trim(),
      sectionNumber: (body.sectionNumber || '01').trim(),
      badge: (body.badge || '').trim(),
      badgeColor: (body.badgeColor || 'bg-emerald-50 text-emerald-700 border-emerald-200').trim(),
      description: (body.description || '').trim(),
      coverImg: coverImgUrl,
      pdfUrl,
      downloadFilename: (body.downloadFilename || `${body.title.replace(/\s+/g, '_')}.pdf`).trim(),
      pages: Number(body.pages) || 0,
      fileSize: (body.fileSize || '').trim(),
      year: (body.year || new Date().getFullYear().toString()).trim(),
      publisher: (body.publisher || 'Alumni Association, Government College of Architecture Lucknow (GCAAA)').trim(),
      theme: (body.theme || 'red').trim(),
      highlights,
      sectionsCovered,
      sortOrder: typeof body.sortOrder === 'number' ? body.sortOrder : 0,
      isPublished: body.isPublished !== false,
    };

    const pub = await PublicationModel.create(pubData);

    return res.status(201).json({
      success: true,
      message: 'Publication created successfully.',
      data: formatPublication(pub),
    });
  } catch (error) {
    if (error instanceof mongoose.Error.ValidationError) {
      return res.status(400).json({ success: false, message: error.message });
    }
    console.error('Error creating publication:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create publication.',
      error: error.message,
    });
  }
};

/**
 * Admin: Update publication
 */
export const updatePublication = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid publication ID.' });
  }

  try {
    const body = req.body;
    const updateData = {};

    if (body.title !== undefined) updateData.title = body.title.trim();
    if (body.tagline !== undefined) updateData.tagline = body.tagline.trim();
    if (body.edition !== undefined) updateData.edition = body.edition.trim();
    if (body.sectionNumber !== undefined) updateData.sectionNumber = body.sectionNumber.trim();
    if (body.badge !== undefined) updateData.badge = body.badge.trim();
    if (body.badgeColor !== undefined) updateData.badgeColor = body.badgeColor.trim();
    if (body.description !== undefined) updateData.description = body.description.trim();
    if (body.downloadFilename !== undefined) updateData.downloadFilename = body.downloadFilename.trim();
    if (body.pages !== undefined) updateData.pages = Number(body.pages);
    if (body.fileSize !== undefined) updateData.fileSize = body.fileSize.trim();
    if (body.year !== undefined) updateData.year = body.year.trim();
    if (body.publisher !== undefined) updateData.publisher = body.publisher.trim();
    if (body.theme !== undefined) updateData.theme = body.theme.trim();
    if (body.sortOrder !== undefined) updateData.sortOrder = Number(body.sortOrder);
    if (body.isPublished !== undefined) updateData.isPublished = Boolean(body.isPublished);

    if (body.pdfUrl !== undefined) {
      let pdfUrl = body.pdfUrl.trim();
      if (pdfUrl && (pdfUrl.startsWith('data:') || !pdfUrl.startsWith('http'))) {
        const cloudPdf = await uploadPdfToCloudinary(pdfUrl, 'gcaaa/publications/pdfs');
        if (cloudPdf) {
          pdfUrl = cloudPdf;
        }
      }
      updateData.pdfUrl = pdfUrl;
    }

    if (body.highlights !== undefined) {
      updateData.highlights = typeof body.highlights === 'string'
        ? body.highlights.split('\n').map((h) => h.trim()).filter(Boolean)
        : body.highlights;
    }

    if (body.sectionsCovered !== undefined) {
      updateData.sectionsCovered = typeof body.sectionsCovered === 'string'
        ? JSON.parse(body.sectionsCovered)
        : body.sectionsCovered;
    }

    // Check cover image upload
    if (body.coverImg) {
      let coverImgUrl = body.coverImg;
      if (coverImgUrl.startsWith('data:image') || !coverImgUrl.startsWith('http')) {
        const cloudUrl = await uploadToCloudinary(coverImgUrl, 'gcaaa/publications');
        if (cloudUrl) {
          updateData.coverImg = cloudUrl;
        }
      } else {
        updateData.coverImg = coverImgUrl;
      }
    }

    const pub = await PublicationModel.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).lean();

    if (!pub) {
      return res.status(404).json({ success: false, message: 'Publication not found.' });
    }

    return res.status(200).json({
      success: true,
      message: 'Publication updated successfully.',
      data: formatPublication(pub),
    });
  } catch (error) {
    if (error instanceof mongoose.Error.ValidationError) {
      return res.status(400).json({ success: false, message: error.message });
    }
    console.error('Error updating publication:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update publication.',
      error: error.message,
    });
  }
};

/**
 * Admin: Delete publication
 */
export const deletePublication = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid publication ID.' });
  }

  try {
    const pub = await PublicationModel.findByIdAndDelete(req.params.id);
    if (!pub) {
      return res.status(404).json({ success: false, message: 'Publication not found.' });
    }

    return res.status(200).json({
      success: true,
      message: 'Publication deleted successfully.',
    });
  } catch (error) {
    console.error('Error deleting publication:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete publication.',
      error: error.message,
    });
  }
};
