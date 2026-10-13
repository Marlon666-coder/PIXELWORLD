import { LostLevel } from "@/components/layout/lost-level";

export default function CompetitionNotFound() {
  return (
    <LostLevel
      title="QUEST NOT FOUND"
      message="This competition doesn't exist, was removed, or hasn't been published yet."
    />
  );
}
