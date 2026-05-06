import { Metadata } from 'next';
import StatusClient from './StatusClient';

export const metadata: Metadata = {
  title: 'System Status',
  description: 'Real-time health status of platform services',
};

/**
 * Status page - Server Component shell
 * The actual UI and polling logic is in StatusClient
 */
export default function StatusPage() {
  return <StatusClient />;
}
