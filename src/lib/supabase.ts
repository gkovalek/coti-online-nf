import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://rvcljicaxjwcefhpqtlm.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2Y2xqaWNheGp3Y2VmaHBxdGxtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxMDQ0NDEsImV4cCI6MjA5MTY4MDQ0MX0.saHfNd7zJ-C4NyY6oBFrIHq2WizmgHqks6FWm5T0PEo";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
