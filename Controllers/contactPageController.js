import ContactPageContent from '../Models/ContactPageContent.js';
import { defaultContactPageContent } from '../Config/contactPageDefaults.js';

const CONTACT_PAGE_KEY = 'contact-page';

export const seedContactPageContent = async () => {
  const result = await ContactPageContent.updateOne(
    { key: CONTACT_PAGE_KEY },
    { $setOnInsert: { content: defaultContactPageContent } },
    { upsert: true, setDefaultsOnInsert: true }
  );

  if (result.upsertedCount) {
    console.log('Initial contact page content created.');
  }
};

const requiredStrings = [
  'hero.title',
  'hero.breadcrumbHome',
  'hero.breadcrumbContact',
  'headquarters.badge',
  'headquarters.title',
  'headquarters.subtitle',
  'headquarters.addressLabel',
  'headquarters.address',
  'headquarters.phoneLabel',
  'headquarters.phone',
  'headquarters.emailLabel',
  'headquarters.email',
  'headquarters.officeHoursLabel',
  'headquarters.officeHours',
  'headquarters.bearersHeading',
  'form.title',
  'form.description',
  'form.nameLabel',
  'form.namePlaceholder',
  'form.emailLabel',
  'form.emailPlaceholder',
  'form.phoneLabel',
  'form.phonePlaceholder',
  'form.subjectLabel',
  'form.messageLabel',
  'form.messagePlaceholder',
  'form.submitLabel',
  'form.successTitle',
  'form.successMessage',
  'form.sendAnotherLabel',
  'campus.badge',
  'campus.title',
  'campus.description',
  'campus.transitHeading',
  'campus.landmarkLabel',
  'campus.landmark',
  'campus.openMapLabel',
  'campus.mapTitle',
  'campus.mapUrl',
  'campus.mapEmbedUrl',
];

const getNestedValue = (object, path) =>
  path.split('.').reduce((value, key) => value?.[key], object);

const validateContent = (content) => {
  if (!content || typeof content !== 'object' || Array.isArray(content)) {
    return 'Contact page content must be an object.';
  }

  for (const path of requiredStrings) {
    const value = getNestedValue(content, path);
    if (typeof value !== 'string' || !value.trim()) {
      return `${path} is required.`;
    }
  }

  const validateEntries = (entries, name, requiredFields) => {
    if (!Array.isArray(entries) || entries.length === 0) {
      return `${name} must contain at least one entry.`;
    }
    for (const [index, entry] of entries.entries()) {
      for (const field of requiredFields) {
        if (typeof entry?.[field] !== 'string' || !entry[field].trim()) {
          return `${name}[${index}].${field} is required.`;
        }
      }
    }
    return null;
  };

  const bearersError = validateEntries(content.headquarters?.bearers, 'headquarters.bearers', [
    'role',
    'name',
    'phone',
  ]);
  if (bearersError) return bearersError;

  const subjectsError = validateEntries(content.form?.subjectOptions, 'form.subjectOptions', [
    'value',
    'label',
  ]);
  if (subjectsError) return subjectsError;

  const stopsError = validateEntries(content.campus?.transitStops, 'campus.transitStops', [
    'name',
    'distance',
    'icon',
  ]);
  if (stopsError) return stopsError;

  if (content.campus.transitStops.some(({ icon }) => !['train', 'plane', 'car'].includes(icon))) {
    return 'Campus transit stop icons must be train, plane, or car.';
  }

  for (const path of ['campus.mapUrl', 'campus.mapEmbedUrl']) {
    try {
      if (new URL(getNestedValue(content, path)).protocol !== 'https:') {
        return `${path} must use HTTPS.`;
      }
    } catch {
      return `${path} must be a valid HTTPS URL.`;
    }
  }

  return null;
};

export const getContactPageContent = async (req, res) => {
  try {
    const record = await ContactPageContent.findOne({ key: CONTACT_PAGE_KEY }).lean();
    return res.status(200).json({ success: true, data: record?.content ?? null });
  } catch (error) {
    console.error('Error fetching contact page content:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch contact page content.',
    });
  }
};

export const getAdminContactPageContent = async (req, res) => {
  try {
    const record = await ContactPageContent.findOne({ key: CONTACT_PAGE_KEY }).lean();
    return res.status(200).json({ success: true, data: record?.content ?? null });
  } catch (error) {
    console.error('Error fetching admin contact page content:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch contact page content.',
    });
  }
};

export const updateContactPageContent = async (req, res) => {
  const validationError = validateContent(req.body?.content);
  if (validationError) {
    return res.status(400).json({ success: false, message: validationError });
  }

  try {
    const record = await ContactPageContent.findOneAndUpdate(
      { key: CONTACT_PAGE_KEY },
      { $set: { content: req.body.content } },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    ).lean();

    return res.status(200).json({
      success: true,
      message: 'Contact page content saved successfully.',
      data: record.content,
    });
  } catch (error) {
    console.error('Error saving contact page content:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to save contact page content.',
    });
  }
};
