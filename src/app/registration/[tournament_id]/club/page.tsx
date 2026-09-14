import React from 'react';
import ClubManagementPage from './ClientPage';

export function generateStaticParams() {
  return [{ tournament_id: 'default' }];
}

export default function Page() {
  return <ClubManagementPage />;
}