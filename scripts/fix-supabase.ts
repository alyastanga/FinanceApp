import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://djjozvxisluwggukukpkl.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqam96dnhpc2x1d2dndWt1cGtsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxMDYzODUsImV4cCI6MjA5MDY4MjM4NX0.GfVUA0CaxpH51Yx4oGXAmL0sSK0nMwgQB_Fpp6ruCX4'

async function repair() {
  const supabase = createClient(supabaseUrl, supabaseAnonKey)
  console.log('--- Supabase Data Repair Initialized ---')
  
  // Fix Incomes
  const { data: incs, error: incErr } = await supabase
    .from('incomes')
    .update({ created_at: new Date().toISOString() })
    .lt('created_at', '1971-01-01')
    .select()

  if (incErr) {
    console.error('Error repairing incomes:', incErr.message)
  } else {
    console.log(`Repaired ${incs?.length || 0} income records.`)
  }

  // Fix Expenses
  const { data: exps, error: expErr } = await supabase
    .from('expenses')
    .update({ created_at: new Date().toISOString() })
    .lt('created_at', '1971-01-01')
    .select()

  if (expErr) {
    console.error('Error repairing expenses:', expErr.message)
  } else {
    console.log(`Repaired ${exps?.length || 0} expense records.`)
  }

  console.log('--- Repair Complete ---')
}

repair().catch(console.error)
