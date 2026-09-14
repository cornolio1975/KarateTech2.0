import React from 'react';
import ClubOfficialsPage from './ClientPage';

export function generateStaticParams() {
  return [{ tournament_id: 'default' }];
}

export default function Page() {
  return <ClubOfficialsPage />;
}