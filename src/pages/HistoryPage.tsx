import { ClipboardList } from "lucide-react";
import { ConsultationCard } from "../components/history/ConsultationCard";
import { Header } from "../components/layout/Header";
import { EmptyState } from "../components/ui/EmptyState";
import { useApp } from "../context/AppContext";

export function HistoryPage() {
  const { consultations } = useApp();
  const sorted = [...consultations].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  return (
    <div className="animate-fade-in">
      <Header title="History" subtitle="Your past consultations" />
      {sorted.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No consultation history yet"
          description="After your first consultation, a record will appear here with the summary, diagnosis, and any prescriptions."
        />
      ) : (
        <div className="flex flex-col gap-3 px-4 py-4">
          {sorted.map((consultation) => (
            <ConsultationCard key={consultation.id} consultation={consultation} />
          ))}
        </div>
      )}
    </div>
  );
}
