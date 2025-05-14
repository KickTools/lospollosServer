// src/models/supabase.js
console.log('Loading Supabase client...');
console.log("Supabase URL:", process.env.SUPABASE_URL);
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export { supabase };