import { createClient } from "./supabase";

export async function linkWallet(walletAddress: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("profiles")
    .update({ wallet_address: walletAddress, updated_at: new Date().toISOString() })
    .eq("id", user.id)
    .select()
    .single();

  if (error) {
    // If another profile already has this wallet, clear theirs and retry
    if (error.code === "23505") {
      // Remove wallet from the other profile
      await supabase
        .from("profiles")
        .update({ wallet_address: null, updated_at: new Date().toISOString() })
        .eq("wallet_address", walletAddress)
        .neq("id", user.id);

      // Retry
      const { data: retryData, error: retryError } = await supabase
        .from("profiles")
        .update({ wallet_address: walletAddress, updated_at: new Date().toISOString() })
        .eq("id", user.id)
        .select()
        .single();

      if (retryError) throw retryError;
      return retryData;
    }
    throw error;
  }
  return data;
}

export async function signUpWithEmail(email: string, password: string) {
  const supabase = createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/dashboard`,
    },
  });

  if (error) throw error;
  return data;
}

export async function signInWithEmail(email: string, password: string) {
  const supabase = createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data;
}

export async function signOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
}

export async function getProfileData() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return data;
}

export async function updateProfile(displayName: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("profiles")
    .update({ display_name: displayName, updated_at: new Date().toISOString() })
    .eq("id", user.id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getMatches() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("matches")
    .select("*")
    .eq("player_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  return data || [];
}

export async function getTransactions() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("transactions")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  return data || [];
}
