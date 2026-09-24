import { useId, useState, type FormEvent } from 'react'
import { EVENT_FIELDS, type EventFormErrors, type EventFormValues } from '../types'
import { NAMED_COLORS } from '../utils/colors'
import { normalizeValues } from '../utils/events'
import { isValid, validateEvent } from '../utils/validate'

interface Props {
  initial?: EventFormValues
  submitLabel: string
  // Receives normalized values. Resolve true on success, false to keep the form as is.
  onSubmit: (values: EventFormValues) => Promise<boolean>
  onCancel?: () => void
  resetOnSuccess?: boolean
}

const EMPTY: EventFormValues = { name: '', description: '', company: '', color: '' }

// One form for both add and edit. The pages supply initial values, a label and an
// onSubmit; the fields, normalization, validation and error display exist once.
export function EventForm({
  initial = EMPTY,
  submitLabel,
  onSubmit,
  onCancel,
  resetOnSuccess = false,
}: Props) {
  const uid = useId()
  const [values, setValues] = useState(initial)
  const [errors, setErrors] = useState<EventFormErrors>({})
  const [submitting, setSubmitting] = useState(false)

  const set = (field: keyof EventFormValues, value: string) => {
    setValues((v) => ({ ...v, [field]: value }))
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const normalized = normalizeValues(values)
    const found = validateEvent(normalized)
    setErrors(found)
    if (!isValid(found)) return
    setSubmitting(true)
    const ok = await onSubmit(normalized)
    setSubmitting(false)
    if (ok && resetOnSuccess) setValues(EMPTY)
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      {EVENT_FIELDS.map((field) => {
        const id = `${uid}-${field}`
        return (
          <div key={field} className="field">
            <label htmlFor={id}>{field}</label>
            <input
              id={id}
              name={field}
              value={values[field]}
              onChange={(e) => set(field, e.target.value)}
              aria-invalid={Boolean(errors[field])}
              aria-describedby={errors[field] ? `${id}-error` : undefined}
              list={field === 'color' ? `${uid}-colors` : undefined}
              placeholder={field === 'color' ? 'A CSS color name: red, steelblue, gold' : undefined}
            />
            {errors[field] && (
              <span id={`${id}-error`} className="field-error">
                {errors[field]}
              </span>
            )}
          </div>
        )
      })}
      <datalist id={`${uid}-colors`}>
        {[...NAMED_COLORS].map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>
      <button type="submit" disabled={submitting}>
        {submitting ? 'Saving...' : submitLabel}
      </button>
      {onCancel && (
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
      )}
    </form>
  )
}
