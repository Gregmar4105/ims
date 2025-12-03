import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface DeleteConfirmationProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title?: string;
    description?: string;
    processing?: boolean;
}

export default function DeleteConfirmation({
    isOpen,
    onClose,
    onConfirm,
    title = "Are you sure?",
    description = "This action cannot be undone. This will permanently delete the item.",
    processing = false,
}: DeleteConfirmationProps) {
    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={processing}>
                        Cancel
                    </Button>
                    <Button variant="destructive" onClick={onConfirm} disabled={processing}>
                        {processing ? "Deleting..." : "Delete"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
