import React, { useState, useEffect, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import {
  Activity,
  Moon,
  Scale,
  Ruler,
  Calendar,
  TrendingUp,
  PlusCircle,
  History,
  User,
  ChevronRight,
  Save,
  LogOut,
  Sparkles,
  Brain,
  Stethoscope,
  Users,
  ArrowLeft,
  Lock,
  MessageCircle,
  Send,
} from "lucide-react";
import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInWithCustomToken,
  signInAnonymously,
  onAuthStateChanged,
  signOut,
} from "firebase/auth";
import {
  getFirestore,
  collection,
  addDoc,
  setDoc,
  doc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  getDoc,
} from "firebase/firestore";

// --- SUAS CHAVES DO FIREBASE ---
const firebaseConfig = {
  apiKey: "AIzaSyD5BHf4llU5_iLc5U69RYMnEltCki1118Q",
  authDomain: "meta-360.firebaseapp.com",
  projectId: "meta-360",
  storageBucket: "meta-360.firebasestorage.app",
  messagingSenderId: "471007709792",
  appId: "1:471007709792:web:096e4227c291271054d105",
  measurementId: "G-SCLKX7PB9X",
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = "meta-360-clinica";

// SENHA DO MÉDICO
const DOCTOR_PASSWORD = "meta";

// --- Componentes Visuais ---

const MetricCard = ({ title, value, unit, icon: Icon, color, trend }: any) => (
  <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between hover:shadow-md transition-shadow">
    <div>
      <p className="text-slate-500 text-xs md:text-sm font-medium mb-1">
        {title}
      </p>
      <h3 className="text-xl md:text-2xl font-bold text-slate-800">
        {value}{" "}
        <span className="text-xs md:text-sm text-slate-400 font-normal">
          {unit}
        </span>
      </h3>
      {trend !== null && trend !== undefined && (
        <p
          className={`text-xs mt-1 font-medium ${
            trend > 0
              ? "text-emerald-500"
              : trend < 0
              ? "text-emerald-500"
              : "text-slate-400"
          }`}
        >
          {trend > 0 ? "+" : ""}
          {trend} vs anterior
        </p>
      )}
    </div>
    <div className={`p-3 rounded-xl bg-opacity-10 ${color.bg}`}>
      <Icon className={`w-5 h-5 md:w-6 md:h-6 ${color.text}`} />
    </div>
  </div>
);

const InputField = ({
  label,
  value,
  onChange,
  type = "number",
  icon: Icon,
  placeholder,
  suffix,
}: any) => (
  <div className="mb-4">
    <label className="block text-sm font-medium text-slate-700 mb-2">
      {label}
    </label>
    <div className="relative">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <Icon className="h-5 w-5 text-slate-400" />
      </div>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="block w-full pl-10 pr-12 py-3 border-slate-200 rounded-xl focus:ring-blue-500 focus:border-blue-500 shadow-sm transition-colors"
        placeholder={placeholder}
      />
      {suffix && (
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
          <span className="text-slate-400 text-sm">{suffix}</span>
        </div>
      )}
    </div>
  </div>
);

// --- O Cérebro do Aplicativo ---

export default function App() {
  // Ativa o Tailwind (Design)
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://cdn.tailwindcss.com";
    document.head.appendChild(script);
  }, []);

  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [mode, setMode] = useState("patient");
  const [view, setView] = useState("dashboard");

  const [logs, setLogs] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<any>(null);

  // Estado para o recado do médico
  const [doctorNote, setDoctorNote] = useState("");
  const [currentPatientData, setCurrentPatientData] = useState<any>(null);

  const [selectedMetric, setSelectedMetric] = useState("weight");
  const [aiAnalysis, setAiAnalysis] = useState("");
  const [analyzing, setAnalyzing] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    weight: "",
    height: "",
    sleepScore: "",
    workoutMinutes: "",
    waist: "",
  });
  const [submitting, setSubmitting] = useState(false);

  // 1. Autenticação
  useEffect(() => {
    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (error) {
        console.error("Erro de Autenticação:", error);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  // 2. Carregar dados (Logs)
  useEffect(() => {
    if (!user || mode === "doctor") {
      if (mode === "patient") setLoading(false);
      return;
    }

    // Busca logs
    const q = query(
      collection(db, "artifacts", appId, "users", user.uid, "weekly_logs"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        dateObj: doc.data().createdAt?.toDate() || new Date(),
        dateFormatted: (
          doc.data().createdAt?.toDate() || new Date()
        ).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
      }));
      setLogs(data);

      if (data.length > 0) {
        const last: any = data[0];
        setFormData((prev) => ({
          ...prev,
          height: last.height || prev.height,
          name: last.patientName || prev.name,
        }));
      }
      setLoading(false);
    });

    // Busca dados públicos do paciente (para ver o recado do médico)
    const unsubPatient = onSnapshot(
      doc(db, "artifacts", appId, "public", "data", "patients", user.uid),
      (doc) => {
        if (doc.exists()) {
          setCurrentPatientData(doc.data());
        }
      }
    );

    return () => {
      unsubscribe();
      unsubPatient();
    };
  }, [user, appId, mode]);

  // 3. Carregar lista de pacientes (Médico)
  useEffect(() => {
    if (!user || mode !== "doctor" || view !== "patient_list") return;

    const q = collection(db, "artifacts", appId, "public", "data", "patients");

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        uid: doc.id,
        ...doc.data(),
        lastUpdateFormatted:
          doc.data().lastUpdate?.toDate().toLocaleDateString("pt-BR") || "N/A",
      }));
      setPatients(data);
    });

    return () => unsubscribe();
  }, [user, appId, mode, view]);

  // 4. Detalhes do Paciente (Médico) - Carrega logs E o recado atual
  useEffect(() => {
    if (
      !user ||
      mode !== "doctor" ||
      view !== "patient_detail" ||
      !selectedPatientId
    )
      return;

    setLoading(true);

    // Logs
    const q = query(
      collection(
        db,
        "artifacts",
        appId,
        "users",
        selectedPatientId,
        "weekly_logs"
      ),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        dateObj: doc.data().createdAt?.toDate() || new Date(),
        dateFormatted: (
          doc.data().createdAt?.toDate() || new Date()
        ).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
      }));
      setLogs(data);
      setLoading(false);
    });

    // Recado Atual
    const unsubPatient = onSnapshot(
      doc(
        db,
        "artifacts",
        appId,
        "public",
        "data",
        "patients",
        selectedPatientId
      ),
      (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          setCurrentPatientData(data);
          if (data.doctorFeedback) setDoctorNote(data.doctorFeedback);
        }
      }
    );

    return () => {
      unsubscribe();
      unsubPatient();
    };
  }, [user, appId, mode, view, selectedPatientId]);

  // --- Ações ---

  const handleDoctorLogin = () => {
    const pwd = prompt("Por favor, digite a senha de acesso médico:");
    if (pwd === DOCTOR_PASSWORD) {
      setMode("doctor");
      setView("patient_list");
    } else {
      alert("Senha incorreta.");
    }
  };

  // Salvar Recado do Médico
  const handleSaveFeedback = async () => {
    if (!selectedPatientId) return;
    try {
      await setDoc(
        doc(
          db,
          "artifacts",
          appId,
          "public",
          "data",
          "patients",
          selectedPatientId
        ),
        {
          doctorFeedback: doctorNote,
          feedbackDate: serverTimestamp(),
        },
        { merge: true }
      );
      alert("Feedback enviado para o paciente!");
    } catch (error) {
      console.error(error);
      alert("Erro ao enviar feedback.");
    }
  };

  const handleSaveLog = async (e: any) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);

    try {
      const timestamp = serverTimestamp();

      await addDoc(
        collection(db, "artifacts", appId, "users", user.uid, "weekly_logs"),
        {
          patientName: formData.name || "Paciente",
          weight: parseFloat(formData.weight),
          height: parseFloat(formData.height),
          sleepScore: parseInt(formData.sleepScore),
          workoutMinutes: parseInt(formData.workoutMinutes),
          waist: parseFloat(formData.waist),
          createdAt: timestamp,
        }
      );

      await setDoc(
        doc(db, "artifacts", appId, "public", "data", "patients", user.uid),
        {
          name: formData.name || "Paciente sem nome",
          lastWeight: parseFloat(formData.weight),
          lastSleep: parseInt(formData.sleepScore),
          lastUpdate: timestamp,
          height: parseFloat(formData.height),
        },
        { merge: true }
      );

      setFormData((prev) => ({
        ...prev,
        weight: "",
        sleepScore: "",
        workoutMinutes: "",
        waist: "",
      }));
      setAiAnalysis("");
      setView("dashboard");
    } catch (error) {
      console.error("Error adding document: ", error);
      alert("Erro ao salvar. Verifique o Firebase.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleGeminiAnalysis = async () => {
    setAiAnalysis(
      "IA em manutenção. Por favor, analise os gráficos manualmente."
    );
  };

  // --- Helpers ---
  const chartData = useMemo(() => [...logs].reverse(), [logs]);
  const latestLog: any = logs[0] || {};
  const previousLog: any = logs[1] || {};

  // --- Interface ---

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20 md:pb-0">
      {/* Cabeçalho */}
      <header
        className={`bg-white border-b border-slate-200 sticky top-0 z-20 ${
          mode === "doctor" ? "border-b-4 border-b-emerald-500" : ""
        }`}
      >
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div
            className="flex items-center space-x-3 cursor-pointer"
            onClick={() => {
              if (mode === "doctor") {
                setView("patient_list");
                setSelectedPatientId(null);
              } else {
                setView("dashboard");
              }
            }}
          >
            <div
              className={`${
                mode === "doctor" ? "bg-emerald-600" : "bg-blue-600"
              } p-2 rounded-lg transition-colors`}
            >
              {mode === "doctor" ? (
                <Stethoscope className="w-5 h-5 text-white" />
              ) : (
                <Activity className="w-5 h-5 text-white" />
              )}
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800 leading-tight">
                Meta 360
              </h1>
              <p
                className={`text-xs font-medium uppercase tracking-wider ${
                  mode === "doctor" ? "text-emerald-600" : "text-blue-600"
                }`}
              >
                {mode === "doctor" ? "Área Médica" : "by Dr. Alberto De Carli"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {mode === "patient" ? (
              <button
                onClick={handleDoctorLogin}
                className="text-xs font-medium text-slate-400 hover:text-blue-600 px-3 py-1 rounded-full hover:bg-blue-50 transition-colors border border-transparent hover:border-blue-100 flex items-center gap-1"
              >
                <Lock className="w-3 h-3" /> Área Médica
              </button>
            ) : (
              <button
                onClick={() => {
                  setMode("patient");
                  setView("dashboard");
                  setSelectedPatientId(null);
                  setLogs([]);
                }}
                className="text-xs font-medium text-slate-400 hover:text-emerald-600 px-3 py-1 rounded-full hover:bg-emerald-50 transition-colors"
              >
                Sair
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {/* --- MÉDICO: LISTA DE PACIENTES --- */}
        {mode === "doctor" && view === "patient_list" && (
          <div className="space-y-6">
            <div className="flex justify-between items-end">
              <h2 className="text-2xl font-bold text-slate-800">
                Seus Pacientes
              </h2>
              <span className="text-sm text-slate-500 bg-white px-3 py-1 rounded-full shadow-sm border border-slate-200">
                {patients.length} ativos
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {patients.map((p) => (
                <div
                  key={p.uid}
                  onClick={() => {
                    setSelectedPatientId(p.uid);
                    setView("patient_detail");
                  }}
                  className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:border-emerald-400 hover:shadow-md transition-all cursor-pointer group"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold">
                        {p.name ? p.name.charAt(0).toUpperCase() : "P"}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-800 group-hover:text-emerald-700 transition-colors">
                          {p.name || "Paciente sem nome"}
                        </h3>
                        <p className="text-xs text-slate-500">
                          Último: {p.lastUpdateFormatted}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-emerald-500" />
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-sm">
                    <div className="bg-slate-50 rounded-lg p-2">
                      <p className="text-slate-400 text-xs">Peso</p>
                      <p className="font-semibold text-slate-700">
                        {p.lastWeight || "-"}kg
                      </p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-2">
                      <p className="text-slate-400 text-xs">Sono</p>
                      <p className="font-semibold text-slate-700">
                        {p.lastSleep || "-"}
                      </p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-2">
                      <p className="text-slate-400 text-xs">IMC</p>
                      <p className="font-semibold text-slate-700">
                        {p.lastWeight && p.height
                          ? (p.lastWeight / (p.height / 100) ** 2).toFixed(1)
                          : "-"}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              {patients.length === 0 && (
                <div className="col-span-full text-center py-12 text-slate-400 bg-white rounded-xl border border-dashed border-slate-300">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p>Nenhum paciente registrou dados ainda.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- DASHBOARD (COMUM) --- */}
        {(view === "dashboard" || view === "patient_detail") && (
          <div className="space-y-6">
            {mode === "doctor" && (
              <>
                <button
                  onClick={() => {
                    setView("patient_list");
                    setSelectedPatientId(null);
                  }}
                  className="flex items-center text-sm text-slate-500 hover:text-emerald-600 mb-4"
                >
                  <ArrowLeft className="w-4 h-4 mr-1" /> Voltar para lista
                </button>

                {/* CARTÃO DE FEEDBACK MÉDICO (APENAS PARA O DOUTOR ESCREVER) */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-emerald-100">
                  <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                    <MessageCircle className="w-5 h-5 text-emerald-600" />
                    Seu Feedback para {currentPatientData?.name || "o Paciente"}
                  </h3>
                  <textarea
                    className="w-full p-3 border border-slate-200 rounded-xl focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                    rows={3}
                    placeholder="Escreva um recado para o paciente ver no app dele..."
                    value={doctorNote}
                    onChange={(e) => setDoctorNote(e.target.value)}
                  />
                  <div className="flex justify-end mt-3">
                    <button
                      onClick={handleSaveFeedback}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                    >
                      <Send className="w-4 h-4" /> Enviar Mensagem
                    </button>
                  </div>
                </div>
              </>
            )}

            {logs.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-3xl shadow-sm border border-dashed border-slate-300">
                <div className="bg-blue-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <PlusCircle className="w-8 h-8 text-blue-600" />
                </div>
                <h2 className="text-xl font-bold text-slate-800 mb-2">
                  {mode === "doctor"
                    ? "Paciente sem dados"
                    : "Bem-vindo ao Meta 360"}
                </h2>
                <p className="text-slate-500 mb-6 max-w-md mx-auto">
                  {mode === "doctor"
                    ? "Aguardando registros."
                    : "Registre seus dados da semana para começar."}
                </p>
                {mode === "patient" && (
                  <button
                    onClick={() => setView("new")}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium shadow-lg shadow-blue-200"
                  >
                    Criar Primeiro Registro
                  </button>
                )}
              </div>
            ) : (
              <>
                {/* ÁREA DE AVISOS PARA O PACIENTE */}
                {mode === "patient" && currentPatientData?.doctorFeedback && (
                  <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="bg-blue-600 p-2 rounded-full text-white mt-1">
                        <MessageCircle className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-bold text-blue-900 text-sm uppercase tracking-wide mb-1">
                          Mensagem do Dr. Alberto
                        </h3>
                        <p className="text-blue-800 leading-relaxed">
                          {currentPatientData.doctorFeedback}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* AI Analysis */}
                <div
                  className={`rounded-2xl p-6 text-white shadow-lg relative overflow-hidden ${
                    mode === "doctor"
                      ? "bg-gradient-to-br from-emerald-600 to-teal-700"
                      : "bg-gradient-to-br from-indigo-600 to-violet-700"
                  }`}
                >
                  <div className="relative z-10">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-yellow-300" />
                        <h3 className="font-bold text-lg">
                          {mode === "doctor"
                            ? "Análise Automática (IA)"
                            : "Análise Inteligente"}
                        </h3>
                      </div>
                      {!aiAnalysis && !analyzing && (
                        <button
                          onClick={handleGeminiAnalysis}
                          className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-sm font-medium rounded-lg backdrop-blur-sm flex items-center gap-2"
                        >
                          <Brain className="w-4 h-4" />
                          {mode === "doctor"
                            ? "Gerar Feedback"
                            : "Gerar Análise"}
                        </button>
                      )}
                    </div>

                    {analyzing ? (
                      <div className="animate-pulse text-sm font-medium opacity-90">
                        Processando dados do paciente...
                      </div>
                    ) : aiAnalysis ? (
                      <div className="animate-fadeIn">
                        <p className="leading-relaxed text-sm md:text-base opacity-95">
                          {aiAnalysis}
                        </p>
                      </div>
                    ) : (
                      <p className="opacity-80 text-sm">
                        {mode === "doctor"
                          ? "Gere uma análise automática para ajudar no seu diagnóstico."
                          : 'Clique em "Gerar Análise" para receber um feedback do Dr. Alberto.'}
                      </p>
                    )}
                  </div>
                </div>

                {/* Cartões de Métricas */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <MetricCard
                    title="Peso"
                    value={latestLog.weight || "-"}
                    unit="kg"
                    icon={Scale}
                    color={{ bg: "bg-blue-500", text: "text-blue-600" }}
                    trend={
                      latestLog.weight && previousLog.weight
                        ? (latestLog.weight - previousLog.weight).toFixed(1)
                        : null
                    }
                  />
                  <MetricCard
                    title="Cintura"
                    value={latestLog.waist || "-"}
                    unit="cm"
                    icon={Ruler}
                    color={{ bg: "bg-purple-500", text: "text-purple-600" }}
                    trend={
                      latestLog.waist && previousLog.waist
                        ? (latestLog.waist - previousLog.waist).toFixed(1)
                        : null
                    }
                  />
                  <MetricCard
                    title="Sono"
                    value={latestLog.sleepScore || "-"}
                    unit="/100"
                    icon={Moon}
                    color={{ bg: "bg-indigo-500", text: "text-indigo-600" }}
                  />
                  <MetricCard
                    title="Treino"
                    value={latestLog.workoutMinutes || "-"}
                    unit="min"
                    icon={Activity}
                    color={{ bg: "bg-emerald-500", text: "text-emerald-600" }}
                  />
                </div>

                {/* Gráfico */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                  <div className="flex flex-wrap items-center justify-between mb-6 gap-4">
                    <h3 className="text-lg font-bold text-slate-800">
                      Evolução
                    </h3>
                    <div className="flex bg-slate-100 p-1 rounded-lg">
                      {[
                        { id: "weight", l: "Peso" },
                        { id: "waist", l: "Cintura" },
                        { id: "sleepScore", l: "Sono" },
                        { id: "workoutMinutes", l: "Treino" },
                      ].map((m) => (
                        <button
                          key={m.id}
                          onClick={() => setSelectedMetric(m.id)}
                          className={`px-3 py-1.5 text-xs md:text-sm font-medium rounded-md transition-all ${
                            selectedMetric === m.id
                              ? "bg-white text-blue-600 shadow-sm"
                              : "text-slate-500"
                          }`}
                        >
                          {m.l}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={chartData}
                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient
                            id="colorMetric"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor={
                                mode === "doctor" ? "#10b981" : "#3b82f6"
                              }
                              stopOpacity={0.2}
                            />
                            <stop
                              offset="95%"
                              stopColor={
                                mode === "doctor" ? "#10b981" : "#3b82f6"
                              }
                              stopOpacity={0}
                            />
                          </linearGradient>
                        </defs>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          vertical={false}
                          stroke="#f1f5f9"
                        />
                        <XAxis
                          dataKey="dateFormatted"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: "#94a3b8", fontSize: 12 }}
                          dy={10}
                        />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: "#94a3b8", fontSize: 12 }}
                          domain={["auto", "auto"]}
                        />
                        <Tooltip
                          contentStyle={{
                            borderRadius: "12px",
                            border: "none",
                            boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey={selectedMetric}
                          stroke={mode === "doctor" ? "#059669" : "#2563eb"}
                          strokeWidth={3}
                          fillOpacity={1}
                          fill="url(#colorMetric)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* --- PACIENTE: NOVO REGISTRO --- */}
        {mode === "patient" && view === "new" && (
          <div className="max-w-xl mx-auto">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                <h2 className="font-bold text-slate-800 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  Novo Registro Semanal
                </h2>
                <button
                  onClick={() => setView("dashboard")}
                  className="text-sm text-slate-500"
                >
                  Cancelar
                </button>
              </div>

              <form onSubmit={handleSaveLog} className="p-6">
                {logs.length === 0 && (
                  <div className="mb-6 p-4 bg-blue-50 rounded-xl border border-blue-100">
                    <InputField
                      label="Seu Nome Completo"
                      value={formData.name}
                      onChange={(v: any) =>
                        setFormData({ ...formData, name: v })
                      }
                      icon={User}
                      type="text"
                      placeholder="Ex: João da Silva"
                    />
                    <p className="text-xs text-blue-600 mt-2">
                      Usado para o Dr. Alberto te identificar.
                    </p>
                  </div>
                )}

                <InputField
                  label="Peso Atual"
                  value={formData.weight}
                  onChange={(v: any) => setFormData({ ...formData, weight: v })}
                  icon={Scale}
                  placeholder="Ex: 75.5"
                  suffix="kg"
                />
                <InputField
                  label="Altura"
                  value={formData.height}
                  onChange={(v: any) => setFormData({ ...formData, height: v })}
                  icon={User}
                  placeholder="Ex: 175"
                  suffix="cm"
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InputField
                    label="Circunferência Abdominal"
                    value={formData.waist}
                    onChange={(v: any) =>
                      setFormData({ ...formData, waist: v })
                    }
                    icon={Ruler}
                    placeholder="Ex: 80"
                    suffix="cm"
                  />
                  <InputField
                    label="Score de Sono"
                    value={formData.sleepScore}
                    onChange={(v: any) =>
                      setFormData({ ...formData, sleepScore: v })
                    }
                    icon={Moon}
                    placeholder="0 - 100"
                    suffix="pts"
                  />
                </div>

                <InputField
                  label="Minutos de Treino (Semana)"
                  value={formData.workoutMinutes}
                  onChange={(v: any) =>
                    setFormData({ ...formData, workoutMinutes: v })
                  }
                  icon={Activity}
                  placeholder="Ex: 150"
                  suffix="min"
                />

                <button
                  type="submit"
                  disabled={submitting}
                  className={`w-full py-4 rounded-xl text-white font-bold text-lg shadow-lg transition-all flex items-center justify-center gap-2 mt-4 ${
                    submitting
                      ? "bg-slate-400"
                      : "bg-blue-600 hover:bg-blue-700"
                  }`}
                >
                  {submitting ? (
                    "Salvando..."
                  ) : (
                    <>
                      <Save className="w-5 h-5" /> Salvar Registro
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        )}
      </main>

      {/* Navegação Inferior */}
      <nav
        className={`fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 pb-safe pt-2 px-6 flex justify-around md:justify-center md:gap-12 z-20 ${
          mode === "doctor" ? "border-t-emerald-200 bg-emerald-50/50" : ""
        }`}
      >
        {mode === "patient" ? (
          <>
            <NavBtn
              icon={TrendingUp}
              label="Dashboard"
              active={view === "dashboard"}
              onClick={() => setView("dashboard")}
            />
            <div className="-mt-8">
              <button
                onClick={() => setView("new")}
                className="h-14 w-14 bg-blue-600 rounded-full flex items-center justify-center shadow-lg text-white hover:scale-105 transition-transform"
              >
                <PlusCircle className="w-8 h-8" />
              </button>
            </div>
            <NavBtn
              icon={History}
              label="Histórico"
              active={view === "history"}
              onClick={() => setView("history")}
            />
          </>
        ) : (
          <p className="text-xs text-emerald-600 font-medium py-3">
            Modo Médico Ativo
          </p>
        )}
      </nav>
    </div>
  );
}

const NavBtn = ({ icon: Icon, label, active, onClick }: any) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center p-2 ${
      active ? "text-blue-600" : "text-slate-400"
    }`}
  >
    <Icon className="w-6 h-6 mb-1" />
    <span className="text-[10px] font-medium uppercase">{label}</span>
  </button>
);
