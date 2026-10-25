/**
 * utils/validation/auth.validation.ts
 * Pure validation functions — no UI dependencies.
 */

export function validateEmail(email: string): string | null {
  if (!email) return 'Email is required'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Enter a valid email address'
  return null
}

export function validatePassword(password: string): string | null {
  if (!password) return 'Password is required'
  if (password.length < 6) return 'Password must be at least 6 characters'
  return null
}

export function validateUsername(username: string): string | null {
  if (!username) return 'Username is required'
  if (username.length < 3) return 'Username must be at least 3 characters'
  if (!/^[a-zA-Z0-9_]+$/.test(username)) return 'Username can only contain letters, numbers, and underscores'
  return null
}

export interface RegisterFormErrors {
  firstName?: string
  email?: string
  username?: string
  password?: string
  confirmPassword?: string
}

export function validateRegisterForm(form: {
  firstName: string
  email: string
  username: string
  password: string
  confirmPassword: string
}): RegisterFormErrors {
  const errors: RegisterFormErrors = {}
  if (!form.firstName) errors.firstName = 'First name is required'
  const emailErr = validateEmail(form.email)
  if (emailErr) errors.email = emailErr
  const usernameErr = validateUsername(form.username)
  if (usernameErr) errors.username = usernameErr
  const passwordErr = validatePassword(form.password)
  if (passwordErr) errors.password = passwordErr
  if (form.password !== form.confirmPassword) errors.confirmPassword = 'Passwords do not match'
  return errors
}