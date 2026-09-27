export const normalizeValues = (v) => ({
  name: v.name.trim(),
  description: v.description.trim(),
  company: v.company.trim(),
  color: v.color.trim().toLowerCase(),
})

export const buildNewEvent = (values, now = new Date()) => ({
  ...values,
  isActive: true,
  date: now.toLocaleDateString('en-CA'),
  time: now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
  email: '',
  phone: '',
  address: '',
  image: '',
  createdOn: now.toISOString(),
})
