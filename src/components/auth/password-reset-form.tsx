import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";

const resetPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

type PasswordResetFormProps = {
  onBackToSignInClick: () => void;
  onSuccess: (
    title: string,
    description: string,
    buttonText: string,
    onButtonClick: () => void
  ) => void;
};

export default function PasswordResetForm({
  onBackToSignInClick,
  onSuccess,
}: PasswordResetFormProps) {
  const { resetPasswordMutation } = useAuth();

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = async ({ email }: ResetPasswordFormValues) => {
    try {
      await resetPasswordMutation.mutateAsync({ email });
      onSuccess(
        "Reset Link Sent",
        "Please check your email for the password reset link.",
        "Back to Sign In",
        onBackToSignInClick
      );
    } catch (error) {
      // Error is handled by the resetPasswordMutation
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div className="text-center">
        <h1 className="text-2xl font-bold text-white mb-2">
          Reset Password
        </h1>
        <p className="text-white/60 text-sm">
          Enter your email and we'll send you a link to reset your password
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input 
                    type="email" 
                    placeholder="Email" 
                    {...field} 
                    className="bg-white/5 border-white/10 text-white focus:border-amber-400/50 focus:ring-amber-400/20"
                  />
                </FormControl>
                <FormMessage className="text-red-400" />
              </FormItem>
            )}
          />

          <div className="pt-2">
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-black font-medium"
              disabled={resetPasswordMutation.isPending}
            >
              {resetPasswordMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending Reset Link...
                </>
              ) : (
                "Send Reset Link"
              )}
            </Button>
          </div>
        </form>
      </Form>

      <div className="text-center">
        <Button
          variant="link"
          onClick={onBackToSignInClick}
          className="text-amber-400 hover:text-amber-300 inline-flex items-center"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Sign In
        </Button>
      </div>
    </motion.div>
  );
}
