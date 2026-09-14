import React from 'react';

export function generateStaticParams() {
  return [{ tournament_id: 'default' }];
}

export default function TournamentLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
