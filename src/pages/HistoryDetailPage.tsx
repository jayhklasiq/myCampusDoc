import { Navigate, useNavigate, useParams } from "react-router-dom";
import { ConsultationDetails } from "../components/history/ConsultationDetails";
import { Header } from "../components/layout/Header";
import { useApp } from "../context/AppContext";
import { findProfessionalById } from "../data";

export function HistoryDetailPage() {
  const { consultationId } = useParams<{ consultationId: string }>();
  const navigate = useNavigate();
  const { consultations, appointments, professionals } = useApp();

  const consultation = consultations.find((c) => c.id === consultationId);
  const professional = consultation
    ? findProfessionalById(professionals, consultation.professionalId)
    : undefined;

  if (!consultation || !professional) {
    return <Navigate to="/history" replace />;
  }

  const followUpAppointment = consultation.followUpAppointmentId
    ? appointments.find((a) => a.id === consultation.followUpAppointmentId)
    : undefined;

  return (
    <div className="min-h-dvh bg-ink-50">
      <Header title="Consultation Record" showBack onBack={() => navigate("/history")} />
      <ConsultationDetails
        consultation={consultation}
        professional={professional}
        followUpAppointment={followUpAppointment}
      />
    </div>
  );
}
