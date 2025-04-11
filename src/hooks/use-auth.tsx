import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { useMutation, UseMutationResult } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { AuthError, User } from "@supabase/supabase-js";

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<User | null, AuthError, LoginData>;
  logoutMutation: UseMutationResult<void, AuthError, void>;
  registerMutation: UseMutationResult<User | null, AuthError, RegisterData>;
  resetPasswordMutation: UseMutationResult<void, AuthError, { email: string }>;
};

type LoginData = {
  email: string;
  password: string;
};

type RegisterData = {
  email: string;
  password: string;
  name?: string;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Initialize auth state
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Login mutation
  const loginMutation = useMutation<User | null, AuthError, LoginData>({
    mutationFn: async (credentials: LoginData) => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });
      
      if (error) throw error;
      return data.user;
    },
    onSuccess: () => {
      toast({
        title: "Login successful",
        description: "Welcome back!",
      });
    },
    onError: (error: AuthError) => {
      console.error("Login mutation error:", error);
      
      if (error.code === "unexpected_failure" && error.status === 500) {
        toast({
          title: "Supabase Configuration Error",
          description: "Your Supabase project is not correctly configured for authentication. Please set up the auth schema in your Supabase project.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Login failed",
          description: error.message || "Invalid email or password. Please try again.",
          variant: "destructive",
        });
      }
    },
  });

  // Register mutation
  const registerMutation = useMutation<User | null, AuthError, RegisterData>({
    mutationFn: async (credentials: RegisterData) => {
      try {
        console.log("Starting registration with credentials:", { 
          email: credentials.email,
          hasPassword: !!credentials.password,
          name: credentials.name || "" 
        });
        
        const { data, error } = await supabase.auth.signUp({
          email: credentials.email,
          password: credentials.password,
          options: {
            data: {
              name: credentials.name || "",
            },
            emailRedirectTo: `${window.location.origin}/auth`,
          },
        });
        
        if (error) {
          console.error("Supabase signup error:", error);
          throw error;
        }
        
        console.log("Registration successful, user data:", data.user);
        return data.user;
      } catch (err) {
        console.error("Registration error:", err);
        throw err;
      }
    },
    onSuccess: () => {
      toast({
        title: "Registration successful",
        description: "Your account has been created. Please check your email for verification.",
      });
    },
    onError: (error: AuthError) => {
      console.error("Registration mutation error:", error);
      
      if (error.code === "unexpected_failure" && error.status === 500) {
        toast({
          title: "Supabase Configuration Error",
          description: "Your Supabase project is not correctly configured for authentication. Please set up the auth schema in your Supabase project.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Registration failed",
          description: error.message || "There was a problem creating your account. Please try again.",
          variant: "destructive",
        });
      }
    },
  });

  // Logout mutation
  const logoutMutation = useMutation<void, AuthError, void>({
    mutationFn: async () => {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Logged out",
        description: "You have been logged out successfully.",
      });
    },
    onError: (error: AuthError) => {
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Reset password mutation
  const resetPasswordMutation = useMutation<void, AuthError, { email: string }>({
    mutationFn: async ({ email }: { email: string }) => {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Password reset link sent",
        description: "Please check your email for the password reset link.",
      });
    },
    onError: (error: AuthError) => {
      toast({
        title: "Password reset failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
        resetPasswordMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}