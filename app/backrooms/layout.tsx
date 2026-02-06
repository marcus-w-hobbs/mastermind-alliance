'use client';

import { TopicsProvider } from '@/components/topics-provider';

export default function BackroomsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <TopicsProvider>{children}</TopicsProvider>;
}
