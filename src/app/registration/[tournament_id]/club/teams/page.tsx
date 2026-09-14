import React from 'react';
import ClubTeamsPage from './ClientPage';

export function generateStaticParams() {
  return [{ tournament_id: 'default' }];
}

export default function Page() {
  return <ClubTeamsPage />;
}