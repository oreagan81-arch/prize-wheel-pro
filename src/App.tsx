import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import { initializeAudio } from "@/lib/sfx";

const queryClient = new QueryClient();

// Eagerly import all asset images so Vite bundles them and we get hashed URLs
const assetModules = import.meta.glob("./assets/*.{png,jpg,jpeg,svg,webp}", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

export const preloadedAssets: Record<string, string> = Object.fromEntries(
  Object.entries(assetModules).map(([path, url]) => {
    const name = path.split("/").pop() ?? path;
    return [name, url];
  })
);

const App = () => {
  useEffect(() => {
    // Preload all bundled image assets into the browser cache
    Object.values(preloadedAssets).forEach((src) => {
      const img = new Image();
      img.src = src;
    });

    // Unlock iOS Web Audio API on first user interaction
    const unlock = () => {
      void initializeAudio();
      document.removeEventListener("touchstart", unlock);
      document.removeEventListener("click", unlock);
    };
    document.addEventListener("touchstart", unlock, { once: true, passive: true });
    document.addEventListener("click", unlock, { once: true });

    return () => {
      document.removeEventListener("touchstart", unlock);
      document.removeEventListener("click", unlock);
    };
  }, []);

  return (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
