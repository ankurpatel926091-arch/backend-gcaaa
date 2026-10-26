import ContactMessage from '../Models/ContactMessage.js';

export const createContactMessage = async (req, res) => {
  const { name, email, phone, subject, message } = req.body ?? {};
  const fields = { name, email, phone, subject, message };

  for (const [field, value] of Object.entries(fields)) {
    if (typeof value !== 'string' || !value.trim()) {
      return res.status(400).json({
        success: false,
        message: `${field} is required.`,
      });
    }
  }

  if (name.trim().length > 120 || email.trim().length > 254 ||
      phone.trim().length > 40 || subject.trim().length > 160 ||
      message.trim().length > 5000) {
    return res.status(400).json({
      success: false,
      message: 'One or more fields exceed the allowed length.',
    });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return res.status(400).json({
      success: false,
      message: 'Enter a valid email address.',
    });
  }

  try {
    const contactMessage = await ContactMessage.create({
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      subject: subject.trim(),
      message: message.trim(),
    });

    return res.status(201).json({
      success: true,
      message: 'Your message has been received.',
      data: { id: contactMessage._id },
    });
  } catch (error) {
    console.error('Error saving contact form submission:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to send your message. Please try again.',
    });
  }
};

export const getContactMessages = async (req, res) => {
  const requestedLimit = Number.parseInt(req.query.limit, 10) || 100;
  const limit = Math.min(Math.max(requestedLimit, 1), 200);

  try {
    const messages = await ContactMessage.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return res.status(200).json({
      success: true,
      count: messages.length,
      data: messages.map((message) => ({
        ...message,
        id: message._id.toString(),
        _id: message._id.toString(),
      })),
    });
  } catch (error) {
    console.error('Error fetching contact form submissions:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch contact form submissions.',
    });
  }
};
