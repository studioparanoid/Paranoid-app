import { createClient } from "@/lib/supabase/client";

// Backwards-compatible export. Every browser consumer now shares the same
// cookie-backed client and auth subscription.
export const supabase = createClient();
