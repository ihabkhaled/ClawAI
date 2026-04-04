"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { LoadingSpinner } from "@/components/common/loading-spinner";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ROUTES } from "@/constants";

export default function ConnectorDetailPage() {
  const params = useParams<{ connectorId: string }>();

  if (!params.connectorId) {
    return <LoadingSpinner label="Loading connector..." />;
  }

  return (
    <div>
      <PageHeader
        title="Connector Detail"
        description={`Connector ${params.connectorId}`}
        actions={
          <Button variant="outline" asChild>
            <Link href={ROUTES.CONNECTORS}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to connectors
            </Link>
          </Button>
        }
      />

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Connector configuration will appear here once data is loaded.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Models</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Available models from this connector will be listed here.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
