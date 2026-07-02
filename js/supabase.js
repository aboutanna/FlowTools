const SUPABASE_URL =
    "https://waqealnjhrajpsljacep.supabase.co";

const SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndhcWVhbG5qaHJhanBzbGphY2VwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI5MzcxMDcsImV4cCI6MjA5ODUxMzEwN30.5L4wS0fpIdR1QVUTwaAlpiR4b69jCQeOLmnQJ1I0DvI";

const db = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);

console.log("Supabase 初始化成功");