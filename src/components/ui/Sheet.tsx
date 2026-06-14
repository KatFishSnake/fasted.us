"use client";
import { Drawer } from "vaul";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: React.ReactNode;
}

/** Bottom sheet (Vaul) with a consistent header + safe-area padding. */
export function Sheet({ open, onOpenChange, title, children }: Props) {
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-black/30" />
        <Drawer.Content className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-w-[414px] flex-col rounded-t-[var(--radius-xl)] border-t border-hairline bg-surface pb-safe outline-none">
          <div className="mx-auto mt-3 h-1.5 w-10 rounded-full bg-hairline" />
          <div className="px-5 pb-2 pt-3">
            <Drawer.Title className="text-lg font-bold text-ink">{title}</Drawer.Title>
          </div>
          <div className="px-5 pb-5">{children}</div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
