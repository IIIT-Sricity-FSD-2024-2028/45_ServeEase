// Rules and lookups for the provider profile form. The server validates the same fields again.
export const supportedCities = [
  { id: 1, name: 'Chennai' }, { id: 2, name: 'Bangalore' }, { id: 3, name: 'Hyderabad' }, { id: 4, name: 'Delhi' }, { id: 5, name: 'Mumbai' },
]

const slug = (value) => String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
const categoryImages = {
  'home-cleaning': '/assets/images/home-cleaning/clean1.jpg',
  'cleaning-services': '/assets/images/home-cleaning/clean1.jpg',
  carpentry: '/assets/images/carpentry/carpentry1.jpg.jpeg',
  painting: '/assets/images/painting/painting1.jpg.jpeg',
  'salon-at-home': '/assets/images/salon-at-home/salon1.jpg',
  plumbing: '/assets/images/plumbing/plumbing1.jpg.jpeg',
  electrician: '/assets/images/electrician/ele1.jpg.jpeg',
  'appliance-repair-installation': '/assets/images/appliance-repair/ACrepair.jpg.jpeg',
  'pest-control': '/assets/images/pest-control/pest1.jpg.jpeg',
}

// Same fallback the original page used when a provider has no photo: an image of their service category.
export const categoryImageFor = (category) => categoryImages[slug(category)] || categoryImages['home-cleaning']

export function cityIdFor(user) {
  if (Number(user?.cityId)) return String(user.cityId)
  const location = String(user?.cityName || user?.location || '').toLowerCase()
  const city = supportedCities.find((item) => location.includes(item.name.toLowerCase()) || (item.name === 'Bangalore' && location.includes('bengaluru')))
  return city ? String(city.id) : ''
}

export function isUnderVerification(user) {
  const raw = [user?.accountStatus, user?.status, user?.approvalStatus, user?.verificationStatus].map((value) => String(value || '').trim().toLowerCase()).find((value) => value && !['none', 'null', 'undefined'].includes(value)) || ''
  return ['pending approval', 'pending', 'under verification'].includes(raw)
}

export function validatePersonal({ fullName, organisationName, phone, cityId }, hasOrganisation) {
  const errors = {}
  if (!/^[A-Za-z\s]{3,}$/.test(String(fullName).trim())) errors.fullName = 'Enter a name using letters only (at least 3).'
  if (hasOrganisation && String(organisationName).trim().length < 2) errors.organisationName = 'Enter your organisation name.'
  if (!/^\d{10}$/.test(String(phone).trim())) errors.phone = 'Enter a 10-digit phone number.'
  if (!supportedCities.some((city) => String(city.id) === String(cityId))) errors.cityId = 'Please select a supported city.'
  return errors
}

export function validateProfessional({ experience }) {
  const value = String(experience).trim()
  return /^\d{1,2}$/.test(value) && Number(value) <= 50 ? {} : { experience: 'Enter experience in whole years (0-50).' }
}

export function validateBank({ bankName, accountHolder, accountNumber, ifsc }) {
  const errors = {}
  const filled = [bankName, accountHolder, accountNumber, ifsc].some((value) => String(value).trim())
  if (!filled) return errors
  if (!String(bankName).trim()) errors.bankName = 'Enter the bank name.'
  if (!/^[A-Za-z\s.]{3,80}$/.test(String(accountHolder).trim())) errors.accountHolder = 'Enter the account holder name.'
  if (!/^\d{9,18}$/.test(String(accountNumber).trim())) errors.accountNumber = 'Account number must be 9-18 digits.'
  if (!/^[A-Za-z]{4}0[A-Za-z0-9]{6}$/.test(String(ifsc).trim())) errors.ifsc = 'Enter a valid IFSC code (e.g. HDFC0001234).'
  return errors
}
