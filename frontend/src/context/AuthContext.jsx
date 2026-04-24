import { createContext, useContext, useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";

const AuthContext = createContext(null);

const IDLE_TIMEOUT = 30 * 60 * 1000;
const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "scroll", "touchstart"];

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!user) return;

    const resetTimer = () => {
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => supabase.auth.signOut(), IDLE_TIMEOUT);
    };

    resetTimer();
    ACTIVITY_EVENTS.forEach((e) => document.addEventListener(e, resetTimer, { passive: true }));

    return () => {
      clearTimeout(timerRef.current);
      ACTIVITY_EVENTS.forEach((e) => document.removeEventListener(e, resetTimer));
    };
  }, [user]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId) => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    setProfile(data);
    setLoading(false);
  };

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  };

  const signUp = async (email, password, fullName) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    return { data, error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  const updateProfile = async ({ full_name, phone, email, address }) => {
    if (email && email !== user?.email) {
      const { error } = await supabase.auth.updateUser({ email });
      if (error) return { error };
    }
    const updates = {};
    if (full_name !== undefined) updates.full_name = full_name;
    if (phone !== undefined) updates.phone = phone;
    if (address !== undefined) updates.address = address;
    if (Object.keys(updates).length > 0) {
      const { error } = await supabase.from("profiles").update(updates).eq("id", user.id);
      if (error) return { error };
    }
    await fetchProfile(user.id);
    return { error: null };
  };

  const isAdmin = profile?.role === "admin";

  return (
    <AuthContext.Provider
      value={{ user, profile, loading, signIn, signUp, signOut, updateProfile, isAdmin }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
};
