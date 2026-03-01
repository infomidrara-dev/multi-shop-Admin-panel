import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const initializedRef = useRef(false);

  const checkAdminRole = async (currentUser: User | null): Promise<boolean> => {
    if (!currentUser) return false;
    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", currentUser.id)
        .eq("role", "admin")
        .maybeSingle();

      if (error) {
        console.error("Admin check error:", error.message);
        return false;
      }
      return !!data;
    } catch {
      return false;
    }
  };

  useEffect(() => {
    // Safety net: never stay stuck on loading
    const timeout = setTimeout(() => {
      setLoading(false);
    }, 5000);

    // Check existing session on mount
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      const adminStatus = await checkAdminRole(currentUser);
      setUser(currentUser);
      setIsAdmin(adminStatus);
      setLoading(false);
      initializedRef.current = true;
      clearTimeout(timeout);
    });

    // React to future auth changes (token refresh, sign out from another tab)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!initializedRef.current) return;
        const currentUser = session?.user ?? null;
        const adminStatus = await checkAdminRole(currentUser);
        setUser(currentUser);
        setIsAdmin(adminStatus);
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  // Resolve email from shop_code then sign in
  const signIn = async (shopId: string, password: string) => {
    // Step 1: look up email from shop_code
    const { data: shop, error: shopError } = await supabase
      .from("shops")
      .select("email")
      .eq("shop_code", shopId)
      .maybeSingle();

    if (shopError || !shop?.email) {
      return { error: { message: "No shop found with that Shop ID." } };
    }

    // Step 2: sign in with email + password using Supabase client
    // This properly registers the session so auth.uid() works in RLS
    const { data, error } = await supabase.auth.signInWithPassword({
      email: shop.email,
      password,
    });

    if (error || !data.user) {
      return { error: { message: "Incorrect Shop ID or password." } };
    }

    // Step 3: verify admin role
    const adminStatus = await checkAdminRole(data.user);
    if (!adminStatus) {
      await supabase.auth.signOut();
      return { error: { message: "You do not have admin access." } };
    }

    setUser(data.user);
    setIsAdmin(true);
    initializedRef.current = true;

    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setIsAdmin(false);
  };

  return { user, isAdmin, loading, signIn, signOut };
}