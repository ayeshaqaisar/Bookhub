import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Lock, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

interface LoginPromptDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  actionLabel?: string;
}

export function LoginPromptDialog({
  isOpen,
  onOpenChange,
  title = "Login Required",
  description = "You need to be logged in to access this feature.",
  actionLabel = "Start Reading",
}: LoginPromptDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mx-auto mb-4">
            <Lock className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center">{title}</DialogTitle>
          <DialogDescription className="text-center pt-2">
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          <p className="text-sm text-muted-foreground text-center">
            Log in to your BookHub account to {actionLabel.toLowerCase()} and access all features.
          </p>
        </div>

        <DialogFooter className="flex flex-col gap-2 sm:flex-col">
          <Link to="/login" className="w-full" onClick={() => onOpenChange(false)}>
            <Button className="w-full">
              <ArrowRight className="h-4 w-4 mr-2" />
              Login
            </Button>
          </Link>
          <Link to="/register" className="w-full" onClick={() => onOpenChange(false)}>
            <Button variant="outline" className="w-full">
              Create Account
            </Button>
          </Link>
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
