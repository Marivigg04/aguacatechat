import { supabase } from './supabaseClient';

export async function isEmailRegistered(email) {
  const { data, error } = await supabase
    .from('profiles')
    .select('email')
    .eq('email', email)
    .maybeSingle();
  if (error) throw error;
  return !!data;
}

export async function sendPasswordResetEmail(email, redirectTo) {
  // Use Supabase auth to send a password reset email with a redirect URL.
  // In Supabase JS v2 this is resetPasswordForEmail
  const opts = redirectTo ? { redirectTo } : {};
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, opts);
  if (error) throw error;
  return data;
}
