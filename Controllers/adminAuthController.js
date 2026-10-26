import jwt from 'jsonwebtoken';
import Admin from '../Models/Admin.js';

const JWT_SECRET = process.env.JWT_SECRET || 'gcaaa_jwt_secure_auth_secret_key_2026_xyz987';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// Generate JWT token helper
const generateToken = (admin) => {
  return jwt.sign(
    {
      id: admin._id,
      email: admin.email,
      role: admin.role,
    },
    JWT_SECRET,
    {
      expiresIn: JWT_EXPIRES_IN,
    }
  );
};

// @desc    Admin Login
// @route   POST /api/admin/auth/login
// @access  Public
const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password.',
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const admin = await Admin.findOne({ email: normalizedEmail });

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    if (!admin.isActive) {
      return res.status(403).json({
        success: false,
        message: 'This admin account has been deactivated. Please contact support.',
      });
    }

    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    // Update last login
    admin.lastLogin = new Date();
    await admin.save();

    const token = generateToken(admin);

    res.status(200).json({
      success: true,
      message: 'Login successful!',
      token,
      admin: admin.toSafeObject(),
    });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during authentication.',
      error: error.message,
    });
  }
};

// @desc    Create / Register New Admin
// @route   POST /api/admin/auth/register
// @access  Public (or Protected by Superadmin)
const registerAdmin = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      role = 'admin',
      designation = 'Administrator',
      department = 'Alumni Affairs & External Relations',
      phone = '',
      avatar = '',
    } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required fields.',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.',
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existingAdmin = await Admin.findOne({ email: normalizedEmail });
    if (existingAdmin) {
      return res.status(409).json({
        success: false,
        message: `An admin account with email '${normalizedEmail}' already exists.`,
      });
    }

    const newAdmin = new Admin({
      name: name.trim(),
      email: normalizedEmail,
      password, // Pre-save hook will hash this
      role,
      designation,
      department,
      phone,
      avatar,
    });

    await newAdmin.save();
    const token = generateToken(newAdmin);

    res.status(201).json({
      success: true,
      message: 'Admin account created successfully!',
      token,
      admin: newAdmin.toSafeObject(),
    });
  } catch (error) {
    console.error('Register Admin Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create admin account.',
      error: error.message,
    });
  }
};

// @desc    Get Current Authenticated Admin Profile
// @route   GET /api/admin/auth/me
// @access  Private (JWT Required)
const getAdminProfile = async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin._id);
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found.',
      });
    }

    res.status(200).json({
      success: true,
      admin: admin.toSafeObject(),
    });
  } catch (error) {
    console.error('Get Profile Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching profile.',
      error: error.message,
    });
  }
};

// @desc    Update Admin Profile
// @route   PUT /api/admin/auth/profile
// @access  Private (JWT Required)
const updateAdminProfile = async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin._id);
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found.',
      });
    }

    const { name, designation, department, phone, avatar } = req.body;

    if (name) admin.name = name.trim();
    if (designation !== undefined) admin.designation = designation;
    if (department !== undefined) admin.department = department;
    if (phone !== undefined) admin.phone = phone;
    if (avatar !== undefined) admin.avatar = avatar;

    await admin.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully!',
      admin: admin.toSafeObject(),
    });
  } catch (error) {
    console.error('Update Profile Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating profile.',
      error: error.message,
    });
  }
};

// @desc    Change Password
// @route   PUT /api/admin/auth/change-password
// @access  Private (JWT Required)
const changeAdminPassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Both current password and new password are required.',
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long.',
      });
    }

    const admin = await Admin.findById(req.admin._id);
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found.',
      });
    }

    const isMatch = await admin.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect.',
      });
    }

    // Set new password (pre-save hook will hash it with bcrypt)
    admin.password = newPassword;
    await admin.save();

    res.status(200).json({
      success: true,
      message: 'Password changed successfully! Please use your new password next time you login.',
    });
  } catch (error) {
    console.error('Change Password Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error changing password.',
      error: error.message,
    });
  }
};

// Helper to seed default admin if none exists
const seedDefaultAdmin = async () => {
  try {
    const count = await Admin.countDocuments();
    if (count === 0) {
      console.log('No admin found in DB. Seeding default superadmin...');
      const defaultAdmin = new Admin({
        name: 'Ar. Alok Nath Srivastava',
        email: 'admin@gcaaa.org',
        password: 'admin@123', // Will be hashed by pre-save
        role: 'superadmin',
        designation: 'Chief Administrator & Registrar',
        department: 'Alumni Affairs & External Relations',
        phone: '+91 94151 89765',
        avatarInitials: 'AS',
      });
      await defaultAdmin.save();
      console.log('Default superadmin seeded: admin@gcaaa.org / admin@123');
    }
  } catch (error) {
    console.error('Error seeding default admin:', error.message);
  }
};

export {
  loginAdmin,
  registerAdmin,
  getAdminProfile,
  updateAdminProfile,
  changeAdminPassword,
  seedDefaultAdmin,
};

export default {
  loginAdmin,
  registerAdmin,
  getAdminProfile,
  updateAdminProfile,
  changeAdminPassword,
  seedDefaultAdmin,
};
