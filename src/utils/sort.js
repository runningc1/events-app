export const sortByCompany = (events) =>
  [...events].sort((a, b) =>
    String(a.company ?? '').localeCompare(String(b.company ?? ''), undefined, {
      sensitivity: 'base',
    }),
  )
