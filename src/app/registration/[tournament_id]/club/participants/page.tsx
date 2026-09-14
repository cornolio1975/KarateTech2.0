import React from 'react';
import ClubParticipantsPage from './ClientPage';

export function generateStaticParams() {
  return [{ tournament_id: 'default' }];
}

export default function Page() {
  return <ClubParticipantsPage />;
}