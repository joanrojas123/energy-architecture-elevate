import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://bairspckeajdheixjgiz.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJhaXJzcGNrZWFqZGhlaXhqZ2l6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1NzkzNzIsImV4cCI6MjA4ODE1NTM3Mn0.DMsb7-xE4gSdugIxsTvU7q19jZJm5Rh8w2jb0dj0Vcs";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
