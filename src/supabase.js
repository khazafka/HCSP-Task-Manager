import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://kffrfuliukmhfsedfyuc.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmZnJmdWxpdWttaGZzZWRmeXVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0NTQ2NDIsImV4cCI6MjA5NzAzMDY0Mn0.vWbM419injPr5QaQ_iHK4fqUib9ysicylY3bfV_SRN4'

export const supabase = createClient(supabaseUrl, supabaseKey)