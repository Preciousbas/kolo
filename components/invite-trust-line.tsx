import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export type InviteTrustView = {
  line: string;
  hasRecord: boolean;
  blobLink: string | null;
};

/** Compact "Kolo remembers" strip for invite / accept screens. */
export function InviteTrustLine({ trust }: { trust: InviteTrustView }) {
  return (
    <Card className="border-border bg-card text-foreground">
      <CardContent className="gap-2 p-4">
        <Badge className="border-border text-muted-foreground">Kolo remembers</Badge>
        {trust.hasRecord && trust.blobLink ? (
          <p className="text-small text-muted-foreground">
            {trust.line.replace(/ · stored on Walrus$/, "")}
            {" · "}
            <a
              className="font-semibold text-accent underline-offset-2 hover:underline"
              href={trust.blobLink}
              target="_blank"
              rel="noreferrer"
            >
              stored on Walrus
            </a>
          </p>
        ) : (
          <p className="text-small text-muted-foreground">{trust.line}</p>
        )}
      </CardContent>
    </Card>
  );
}
