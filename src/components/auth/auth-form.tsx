import { useState, ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import SignUpForm from "./signup-form";
import SignInForm from "./signin-form";
import PasswordResetForm from "./password-reset-form";
import SuccessMessage, { SuccessMessageProps } from "./success-message";
import { motion } from "framer-motion";

type FormView = "signup" | "signin" | "reset" | "success";

export default function AuthForm() {
  const [view, setView] = useState<FormView>("signin");
  const [successInfo, setSuccessInfo] = useState<SuccessMessageProps>({
    title: "",
    description: "",
    buttonText: "",
    onButtonClick: () => {},
  });

  const handleViewChange = (view: FormView) => {
    setView(view);
  };

  const handleSuccess = (
    title: string,
    description: string,
    buttonText: string,
    onButtonClick: () => void
  ) => {
    setSuccessInfo({
      title,
      description,
      buttonText,
      onButtonClick,
    });
    setView("success");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full"
    >
      <div className="w-full">
        {view !== "reset" && view !== "success" && (
          <Tabs
            defaultValue={view}
            value={view}
            onValueChange={(v) => handleViewChange(v as FormView)}
            className="w-full"
          >
            <TabsList className="w-full grid grid-cols-2 rounded-none bg-transparent mb-6">
              <TabsTrigger
                value="signup"
                className="py-3 text-white/70 data-[state=active]:text-white bg-[#17223b] data-[state=active]:bg-transparent rounded-t-lg"
              >
                Sign Up
              </TabsTrigger>
              <TabsTrigger
                value="signin"
                className="py-3 text-white/70 data-[state=active]:text-white bg-[#17223b] data-[state=active]:bg-transparent rounded-t-lg"
              >
                Sign In
              </TabsTrigger>
            </TabsList>

            <TabsContent value="signup">
              <SignUpForm
                onSignInClick={() => handleViewChange("signin")}
                onSuccess={handleSuccess}
              />
            </TabsContent>

            <TabsContent value="signin">
              <SignInForm
                onSignUpClick={() => handleViewChange("signup")}
                onForgotPasswordClick={() => handleViewChange("reset")}
                onSuccess={handleSuccess}
              />
            </TabsContent>
          </Tabs>
        )}

        {view === "reset" && (
          <div>
            <PasswordResetForm
              onBackToSignInClick={() => handleViewChange("signin")}
              onSuccess={handleSuccess}
            />
          </div>
        )}

        {view === "success" && (
          <div>
            <SuccessMessage
              title={successInfo.title}
              description={successInfo.description}
              buttonText={successInfo.buttonText}
              onButtonClick={successInfo.onButtonClick}
            />
          </div>
        )}
      </div>
    </motion.div>
  );
}
