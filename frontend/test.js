import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://gfjkhzudkctakwcyqmmj.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdmamtoenVka2N0YWt3Y3lxbW1qIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjU0MTA3MiwiZXhwIjoyMDkyMTE3MDcyfQ.stJEVAbxwKu8pPfF6xWl9aqse0YdhaiwQeumrBaEMqM";

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", "0782aa63-f34f-41e9-886d-2c607b300224")
    .single();

  console.log("Data:", data);
  console.log("Error:", error);
}

run();
