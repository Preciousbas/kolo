"use client";

import { useEffect, useState } from "react";

type Health = {
  network?: string;
  tatum?: string;
  memory?: string;
  checkpoint?: { seq: string; via: string } | null;
};

export function CircleHealth() {
  const [health, setHealth] = useState<Health | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let gone = false;
    fetch("/api/health")
      .then((response) => response.json())
      .then((body: Health) => {
        if (!gone) setHealth(body);
      })
      .catch(() => {
        if (!gone) setFailed(true);
      });
    return () => {
      gone = true;
    };
  }, []);

  if (failed) {
    return <p>last synced checkpoint: unavailable</p>;
  }
  if (!health) {
    return <p>last synced checkpoint: loading</p>;
  }
  const checkpoint = health.checkpoint
    ? `${health.checkpoint.seq} via ${health.checkpoint.via}`
    : "unavailable";
  return (
    <div className="flex flex-col gap-2 text-sm">
      <p>network: {health.network}</p>
      <p>last synced checkpoint: {checkpoint}</p>
      <p>Members placeholder</p>
    </div>
  );
}
