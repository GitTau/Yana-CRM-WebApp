
import { createClient } from '@supabase/supabase-js';

// TODO: Replace with your actual Supabase project URL and Anon Key
const supabaseUrl = 'https://zukkmawqraoajeznhzow.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1a2ttYXdxcmFvYWplem5oem93Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUwOTI3MzksImV4cCI6MjA4MDY2ODczOX0.PoCP5kd9muM8-ZWj3U9Mm2hYqpMR7KJAq_zT2iRzbpQ';

export const supabase = createClient(supabaseUrl, supabaseKey);
