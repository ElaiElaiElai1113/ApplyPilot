'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from './supabase/server'
import { logEvent } from './observability'
import { trackServerEvent } from './analytics/server'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MIN_PASSWORD_LENGTH = 8
const MAX_FULL_NAME_LENGTH = 120

function getFormString(formData: FormData, key: string): string {
  const value = formData.get(key)
  return typeof value === 'string' ? value.trim() : ''
}

export async function signUp(formData: FormData) {
  const supabase = await createClient()
  const email = getFormString(formData, 'email').toLowerCase()
  const password = getFormString(formData, 'password')
  const fullName = getFormString(formData, 'fullName').slice(0, MAX_FULL_NAME_LENGTH)

  if (!EMAIL_REGEX.test(email)) {
    return { error: 'Please enter a valid email address.' }
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` }
  }
  if (!fullName) {
    return { error: 'Please add your full name.' }
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  })

  if (error) {
    logEvent('warn', 'signup_failed', { message: error.message })
    return { error: error.message }
  }

  // Profile row is created by DB trigger on auth.users.
  void trackServerEvent('signup_completed')
  revalidatePath('/', 'layout')
  return { success: true, requiresEmailConfirmation: !data.session }
}

export async function signIn(formData: FormData) {
  const supabase = await createClient()
  const email = getFormString(formData, 'email').toLowerCase()
  const password = getFormString(formData, 'password')

  if (!EMAIL_REGEX.test(email)) {
    return { error: 'Please enter a valid email address.' }
  }
  if (!password) {
    return { error: 'Please enter your password.' }
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    logEvent('warn', 'signin_failed', { message: error.message })
    return { error: error.message }
  }

  void trackServerEvent('signin_completed')

  revalidatePath('/', 'layout')
  return { success: true }
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/')
}

export async function getCurrentUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}
