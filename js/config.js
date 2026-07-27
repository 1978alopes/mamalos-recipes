"use strict";

const SUPABASE_URL =
  "https://fztasvfkvdqjwajhcbfe.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_rszD07mbsSkmmp3vAvIjVQ_Hij2_1gU";

const supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);
