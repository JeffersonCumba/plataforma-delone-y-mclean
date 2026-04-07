"use client";

import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";

export function RefreshAnalyticsButton() {
  const router = useRouter();

  return (
    <Button variant="outline" onClick={() => router.refresh()}>
      <RefreshCw className="mr-2 h-4 w-4" />
      Refrescar Datos
    </Button>
  );
}
