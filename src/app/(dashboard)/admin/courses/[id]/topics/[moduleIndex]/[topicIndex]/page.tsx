import * as React from "react";
import HalamanEditTopikClient from "./HalamanEditTopikClient";

interface EditTopikPageProps {
  params: Promise<{
    id: string;
    moduleIndex: string;
    topicIndex: string;
  }>;
}

export default async function EditTopikPage({ params }: EditTopikPageProps) {
  const resolvedParams = await params;

  return (
    <HalamanEditTopikClient
      courseId={resolvedParams.id}
      moduleIndexStr={resolvedParams.moduleIndex}
      topicIndexStr={resolvedParams.topicIndex}
    />
  );
}

