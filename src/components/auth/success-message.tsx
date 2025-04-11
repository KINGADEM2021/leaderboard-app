import { CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export type SuccessMessageProps = {
  title: string;
  description: string;
  buttonText: string;
  onButtonClick: () => void;
};

export default function SuccessMessage({
  title,
  description,
  buttonText,
  onButtonClick,
}: SuccessMessageProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="text-center space-y-6"
    >
      <div className="flex flex-col items-center">
        <div className="w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center mb-4">
          <CheckCircle className="h-8 w-8 text-amber-400" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">{title}</h2>
        <p className="text-white/60 max-w-md mx-auto">{description}</p>
      </div>

      <Button 
        onClick={onButtonClick}
        className="bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-black font-medium px-6"
      >
        {buttonText}
      </Button>
    </motion.div>
  );
}
