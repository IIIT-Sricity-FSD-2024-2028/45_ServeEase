// Body for POST /auth/register. The backend RegisterDto rejects unknown fields (confirmPassword) and validates
// any provider field that is present, so customers send only account fields and providers add theirs.
const slug = (value) => String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

// The catalog's sub-services for the chosen category (the only services a provider can register with).
export function categoryServices(categories = [], serviceType = '') {
  const wanted = slug(serviceType) === 'cleaning-services' ? 'home-cleaning' : slug(serviceType)
  const category = categories.find((item) => slug(item.id) === wanted || slug(item.name) === wanted)
  return Array.isArray(category?.subServices) ? category.subServices : []
}

const customServiceName = /^[A-Za-z0-9][A-Za-z0-9&/\-+' ]{1,119}$/

// A provider may offer something the category does not list yet: "Other" takes its own name and price.
export function customServiceError(custom, available, offered) {
  if (!custom?.enabled) return false
  const name = String(custom.name || '').trim()
  if (!name) return 'Enter the name of the service you offer.'
  if (!customServiceName.test(name)) return 'Use letters, numbers, spaces or & / - + for the service name.'
  const taken = [...available, ...Object.keys(offered)].some((item) => String(item).trim().toLowerCase() === name.toLowerCase())
  if (taken) return 'That service is already listed above. Tick it there instead.'
  const price = Number(custom.price)
  if (!(price >= 1 && price <= 1000000)) return 'Enter a price of at least 1 for this service.'
  return false
}

// `offered` maps sub-service name -> price text for the ticked services. Only ticked, priced entries are sent.
export function servicesPayload(offered = {}) {
  return Object.entries(offered).filter(([, price]) => price !== undefined && price !== null).map(([name, price]) => ({ name, price: Number(price) }))
}

export function signupPayload(role, values, documents = [], offered = {}) {
  const account = { role, fullName: values.fullName, email: values.email, phone: values.phone, password: values.password }
  if (role !== 'provider') return account
  return {
    ...account,
    organisationName: values.organisationName,
    serviceType: values.serviceType,
    experience: values.experience === '' ? undefined : Number(values.experience),
    cityId: values.cityId === '' ? undefined : Number(values.cityId),
    address: values.address,
    idProofType: values.idProofType,
    documents,
    services: servicesPayload(offered),
  }
}
