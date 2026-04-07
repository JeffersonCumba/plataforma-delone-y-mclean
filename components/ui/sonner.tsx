"use client";

import { Toaster as SonnerToaster } from "sonner";

type ToasterProps = React.ComponentProps<typeof SonnerToaster>;

function Toaster(props: ToasterProps) {
  return (
    <SonnerToaster
      theme="light"
      richColors
      closeButton
      toastOptions={{
        classNames: {
          toast: "border border-slate-200 bg-white text-slate-900",
          description: "text-slate-600",
        },
      }}
      {...props}
    />
  );
}

export { Toaster };
