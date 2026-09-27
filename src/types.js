/**
 * Shape of an event record as stored by rf-json-server; fields from the PDF's sample POST.
 * POST bodies never include id; the server assigns it.
 *
 * @typedef {object} EventRecord
 * @property {number} id
 * @property {string} name
 * @property {string} description
 * @property {string} company
 * @property {string} color
 * @property {boolean} isActive
 * @property {string} date
 * @property {string} time
 * @property {string} email
 * @property {string} phone
 * @property {string} address
 * @property {string} image
 * @property {string} createdOn
 */

// The four fields the assignment requires the user to be able to enter and edit.
export const EVENT_FIELDS = ['name', 'description', 'company', 'color']
