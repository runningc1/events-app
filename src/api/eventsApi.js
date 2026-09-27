import axios from 'axios'

export const API_BASE =
  import.meta.env.VITE_API_BASE ?? 'https://rf-json-server.herokuapp.com/events'

export const getAll = () => axios.get(API_BASE).then((r) => r.data)

export const getOne = (id) => axios.get(`${API_BASE}/${id}`).then((r) => r.data)

// POST body must not contain id; the server assigns it.
export const create = (event) => axios.post(API_BASE, event).then((r) => r.data)

// json-server PUT replaces the whole record, so callers send every field.
export const update = (id, event) => axios.put(`${API_BASE}/${id}`, event).then((r) => r.data)

export const remove = (id) => axios.delete(`${API_BASE}/${id}`)
