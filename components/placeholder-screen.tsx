import Link from "next/link";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function PlaceholderScreen({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col gap-6 p-6">
      <nav className="flex gap-4 text-sm">
        <Link href="/" className="underline">
          Home
        </Link>
        <Link href="/circles" className="underline">
          Circles
        </Link>
        <Link href="/join" className="underline">
          Join
        </Link>
        <Link href="/profile" className="underline">
          Profile
        </Link>
      </nav>
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p>UI per HANDOFF.md (pending)</p>
          <Badge>placeholder</Badge>
          {children}
        </CardContent>
      </Card>
    </main>
  );
}
