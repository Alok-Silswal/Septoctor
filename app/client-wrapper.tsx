'use client';

import { useEffect, useState } from 'react';

export default function ClientWrapper({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Render children immediately but suppress hydration mismatches
  // by only showing full UI after mount
  return (
    <div suppressHydrationWarning>
      {mounted ? children : (
        <div className="min-h-screen bg-gradient-to-br from-medical-blue to-medical-teal flex items-center justify-center">
          <div className="text-white text-xl">Loading Septoctor...</div>
        </div>
      )}
    </div>
  );
}
