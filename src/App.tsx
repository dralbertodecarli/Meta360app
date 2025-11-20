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
  LogIn,
  Target,
  FileText,
  Percent,
  ClipboardList,
} from "lucide-react";
import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
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
const googleProvider = new GoogleAuthProvider();
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
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://cdn.tailwindcss.com";
    document.head.appendChild(script);
  }, []);

  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loading, setLoading] = useState(false);

  const [mode, setMode] = useState("patient");
  const [view, setView] = useState("dashboard");

  const [logs, setLogs] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<any>(null);

  // Dados do Paciente (Feedback + Metas)
  const [doctorNote, setDoctorNote] = useState("");
  const [medicalPlan, setMedicalPlan] = useState({
    diagnosis: "",
    targetWeight: "",
    targetBodyFat: "",
    otherGoals: "",
  });
  const [currentPatientData, setCurrentPatientData] = useState<any>(null);

  const [selectedMetric, setSelectedMetric] = useState("weight");
  const [aiAnalysis, setAiAnalysis] = useState("");
  const [analyzing, setAnalyzing] = useState(false);

  const [formData, setFormData] = useState({
    weight: "",
    height: "",
    sleepScore: "",
    workoutMinutes: "",
    waist: "",
  });
  const [submitting, setSubmitting] = useState(false);

  // 1. Monitorar Autenticação
  useEffect(() => {
    getRedirectResult(auth)
      .then((result) => {
        if (result) setUser(result.user);
      })
      .catch((error) => console.error(error));

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 2. Carregar dados (Logs)
  useEffect(() => {
    if (!user || mode === "doctor") return;

    setLoading(true);
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
        }));
      }
      setLoading(false);
    });

    const unsubPatient = onSnapshot(
      doc(db, "artifacts", appId, "public", "data", "patients", user.uid),
      (doc) => {
        if (doc.exists()) {
          setCurrentPatientData(doc.data());
          // Carrega metas para o paciente ver
          const d = doc.data();
          setMedicalPlan({
            diagnosis: d.diagnosis || "",
            targetWeight: d.targetWeight || "",
            targetBodyFat: d.targetBodyFat || "",
            otherGoals: d.otherGoals || "",
          });
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

  // 4. Detalhes do Paciente (Médico)
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

    // Dados Públicos (Metas e Feedback)
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

          setMedicalPlan({
            diagnosis: data.diagnosis || "",
            targetWeight: data.targetWeight || "",
            targetBodyFat: data.targetBodyFat || "",
            otherGoals: data.otherGoals || "",
          });
        } else {
          setMedicalPlan({
            diagnosis: "",
            targetWeight: "",
            targetBodyFat: "",
            otherGoals: "",
          });
          setDoctorNote("");
        }
      }
    );

    return () => {
      unsubscribe();
      unsubPatient();
    };
  }, [user, appId, mode, view, selectedPatientId]);

  // --- Ações ---

  const handleGoogleLogin = async () => {
    try {
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      if (isMobile) {
        await signInWithRedirect(auth, googleProvider);
      } else {
        await signInWithPopup(auth, googleProvider);
      }
    } catch (error) {
      console.error("Erro no login:", error);
      alert(
        "Erro ao fazer login. Tente abrir o link no navegador Chrome ou Safari."
      );
    }
  };

  const handleLogout = () => {
    signOut(auth);
    setMode("patient");
    setView("dashboard");
  };

  const handleDoctorLogin = () => {
    const pwd = prompt("Por favor, digite a senha de acesso médico:");
    if (pwd === DOCTOR_PASSWORD) {
      setMode("doctor");
      setView("patient_list");
    } else {
      alert("Senha incorreta.");
    }
  };

  const handleSaveFeedbackAndPlan = async () => {
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
          diagnosis: medicalPlan.diagnosis,
          targetWeight: medicalPlan.targetWeight,
          targetBodyFat: medicalPlan.targetBodyFat,
          otherGoals: medicalPlan.otherGoals,
          feedbackDate: serverTimestamp(),
        },
        { merge: true }
      );
      alert("Planejamento salvo com sucesso!");
    } catch (error) {
      console.error(error);
      alert("Erro ao salvar.");
    }
  };

  const handleSaveLog = async (e: any) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);

    try {
      const timestamp = serverTimestamp();
      const patientName = user.displayName || user.email || "Paciente";

      await addDoc(
        collection(db, "artifacts", appId, "users", user.uid, "weekly_logs"),
        {
          patientName: patientName,
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
          name: patientName,
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
      setView("dashboard");
    } catch (error) {
      console.error("Error adding document: ", error);
      alert("Erro ao salvar.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleGeminiAnalysis = async () => {
    setAiAnalysis("IA em manutenção.");
  };

  // --- Helpers ---
  const chartData = useMemo(() => [...logs].reverse(), [logs]);
  const latestLog: any = logs[0] || {};

  // --- Interface ---

  if (authLoading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <div className="bg-white p-8 rounded-3xl shadow-lg w-full max-w-sm text-center">
          <div className="bg-blue-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-blue-200 shadow-lg">
            <Activity className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Meta 360</h1>
          <p className="text-slate-500 mb-8">by Dr. Alberto De Carli</p>

          <button
            onClick={handleGoogleLogin}
            className="w-full py-4 bg-white border-2 border-slate-100 hover:border-blue-500 hover:bg-blue-50 text-slate-700 font-bold rounded-xl flex items-center justify-center gap-3 transition-all shadow-sm"
          >
            <span className="text-lg font-bold">G</span>
            Entrar com Google
          </button>
          <p className="text-xs text-slate-400 mt-6">
            Entre em 1 clique e acompanhe sua evolução
          </p>
        </div>
        <button
          onClick={handleDoctorLogin}
          className="mt-8 text-xs text-slate-400 hover:text-blue-600 flex items-center gap-1"
        >
          <Lock className="w-3 h-3" /> Acesso Médico
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20 md:pb-0">
      <header
        className={`bg-white border-b border-slate-200 sticky top-0 z-20 ${
          mode === "doctor" ? "border-b-4 border-b-indigo-500" : ""
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
                mode === "doctor" ? "bg-indigo-600" : "bg-blue-600"
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
                  mode === "doctor" ? "text-indigo-600" : "text-blue-600"
                }`}
              >
                {mode === "doctor" ? "Área Médica" : "by Dr. Alberto De Carli"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {mode === "patient" && (
              <button
                onClick={handleDoctorLogin}
                className="text-xs font-medium text-indigo-500 hover:text-indigo-700 px-3 py-1 rounded-full hover:bg-indigo-50 transition-colors border border-transparent hover:border-indigo-100 flex items-center gap-1"
              >
                <Lock className="w-3 h-3" />{" "}
                <span className="hidden sm:inline">Área Médica</span>
              </button>
            )}
            <button
              onClick={handleLogout}
              className="text-xs font-medium text-slate-400 hover:text-red-600 px-3 py-1 rounded-full hover:bg-red-50 transition-colors border border-transparent hover:border-red-100 flex items-center gap-1"
            >
              <LogOut className="w-3 h-3" /> Sair
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {/* --- MÉDICO: LISTA --- */}
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
                  className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:border-indigo-400 hover:shadow-md transition-all cursor-pointer group"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
                        {p.name ? p.name.charAt(0).toUpperCase() : "P"}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-800 group-hover:text-indigo-700 transition-colors">
                          {p.name || "Paciente sem nome"}
                        </h3>
                        <p className="text-xs text-slate-500">
                          Último: {p.lastUpdateFormatted}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-indigo-500" />
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
                  className="flex items-center text-sm text-slate-500 hover:text-indigo-600 mb-4"
                >
                  <ArrowLeft className="w-4 h-4 mr-1" /> Voltar para lista
                </button>

                {/* ÁREA DO MÉDICO: PLANEJAMENTO CLÍNICO */}
                <div className="bg-white p-6 rounded-2xl shadow-md border-l-4 border-indigo-500">
                  <h3 className="font-bold text-xl text-slate-800 mb-6 flex items-center gap-2">
                    <ClipboardList className="w-6 h-6 text-indigo-600" />
                    Planejamento Clínico
                  </h3>

                  <div className="space-y-5">
                    {/* Diagnóstico */}
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 block">
                        Diagnóstico
                      </label>
                      <textarea
                        className="w-full p-3 border border-slate-200 rounded-xl focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                        rows={2}
                        placeholder="Ex: Obesidade Grau 1 com resistência à insulina..."
                        value={medicalPlan.diagnosis}
                        onChange={(e) =>
                          setMedicalPlan({
                            ...medicalPlan,
                            diagnosis: e.target.value,
                          })
                        }
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 block">
                          Meta de Peso (kg)
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            className="w-full p-3 pl-10 border border-slate-200 rounded-xl focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                            placeholder="70"
                            value={medicalPlan.targetWeight}
                            onChange={(e) =>
                              setMedicalPlan({
                                ...medicalPlan,
                                targetWeight: e.target.value,
                              })
                            }
                          />
                          <Target className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 block">
                          Meta Gordura (%)
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            className="w-full p-3 pl-10 border border-slate-200 rounded-xl focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                            placeholder="15"
                            value={medicalPlan.targetBodyFat}
                            onChange={(e) =>
                              setMedicalPlan({
                                ...medicalPlan,
                                targetBodyFat: e.target.value,
                              })
                            }
                          />
                          <Percent className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                        </div>
                      </div>
                    </div>

                    {/* Outros Objetivos */}
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 block">
                        Outros Objetivos / Observações
                      </label>
                      <textarea
                        className="w-full p-3 border border-slate-200 rounded-xl focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                        rows={2}
                        placeholder="Ex: Beber 3L de água, dormir antes das 23h..."
                        value={medicalPlan.otherGoals}
                        onChange={(e) =>
                          setMedicalPlan({
                            ...medicalPlan,
                            otherGoals: e.target.value,
                          })
                        }
                      />
                    </div>

                    <div className="border-t border-slate-100 pt-4">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 block">
                        Recado para o Paciente (Chat)
                      </label>
                      <div className="relative">
                        <textarea
                          className="w-full p-3 pl-10 border border-slate-200 rounded-xl focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                          rows={2}
                          placeholder="Escreva um feedback direto..."
                          value={doctorNote}
                          onChange={(e) => setDoctorNote(e.target.value)}
                        />
                        <MessageCircle className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end mt-6">
                    <button
                      onClick={handleSaveFeedbackAndPlan}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors shadow-lg shadow-indigo-200"
                    >
                      <Save className="w-4 h-4" /> Salvar Planejamento
                    </button>
                  </div>
                </div>

                <div className="my-6 border-t border-slate-200"></div>
              </>
            )}

            {logs.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-3xl shadow-sm border border-dashed border-slate-300">
                <p className="text-slate-500">Aguardando registros...</p>
                {mode === "patient" && (
                  <button
                    onClick={() => setView("new")}
                    className="mt-4 px-6 py-3 bg-blue-600 text-white rounded-xl"
                  >
                    Criar Primeiro Registro
                  </button>
                )}
              </div>
            ) : (
              <>
                {/* ÁREA DE AVISOS E METAS PARA O PACIENTE */}
                {mode === "patient" && currentPatientData && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    {/* Cartão de Metas */}
                    {(currentPatientData.diagnosis ||
                      currentPatientData.targetWeight ||
                      currentPatientData.targetBodyFat) && (
                      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-16 h-16 bg-indigo-50 rounded-bl-full -mr-4 -mt-4"></div>
                        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2 relative z-10">
                          <Target className="w-5 h-5 text-indigo-600" /> Minhas
                          Metas
                        </h3>
                        <div className="space-y-4 relative z-10">
                          {currentPatientData.diagnosis && (
                            <div>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                Diagnóstico
                              </span>
                              <p className="text-slate-800 font-medium leading-snug">
                                {currentPatientData.diagnosis}
                              </p>
                            </div>
                          )}
                          <div className="flex gap-4">
                            {currentPatientData.targetWeight && (
                              <div className="flex-1">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                  Meta Peso
                                </span>
                                <p className="text-indigo-600 font-bold text-xl">
                                  {currentPatientData.targetWeight}{" "}
                                  <span className="text-sm font-normal text-slate-500">
                                    kg
                                  </span>
                                </p>
                              </div>
                            )}
                            {currentPatientData.targetBodyFat && (
                              <div className="flex-1">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                  Meta Gordura
                                </span>
                                <p className="text-purple-600 font-bold text-xl">
                                  {currentPatientData.targetBodyFat}
                                  <span className="text-sm">%</span>
                                </p>
                              </div>
                            )}
                          </div>
                          {currentPatientData.otherGoals && (
                            <div className="pt-2 border-t border-slate-50">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                Outros Objetivos
                              </span>
                              <p className="text-slate-600 text-sm mt-1">
                                {currentPatientData.otherGoals}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Cartão de Recado */}
                    {currentPatientData.doctorFeedback && (
                      <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-6 rounded-2xl shadow-lg text-white">
                        <div className="flex items-start gap-3">
                          <div className="bg-white/20 p-2 rounded-full mt-1 backdrop-blur-sm">
                            <MessageCircle className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="font-bold text-blue-100 text-xs uppercase tracking-wide mb-2">
                              Mensagem do Dr. Alberto
                            </h3>
                            <p className="text-white leading-relaxed text-md font-medium">
                              "{currentPatientData.doctorFeedback}"
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Cartões de Métricas e Gráficos (Mantidos igual) */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <MetricCard
                    title="Peso"
                    value={latestLog.weight}
                    unit="kg"
                    icon={Scale}
                    color={{ bg: "bg-blue-500", text: "text-blue-600" }}
                    trend={null}
                  />
                  <MetricCard
                    title="Cintura"
                    value={latestLog.waist}
                    unit="cm"
                    icon={Ruler}
                    color={{ bg: "bg-purple-500", text: "text-purple-600" }}
                    trend={null}
                  />
                  <MetricCard
                    title="Sono"
                    value={latestLog.sleepScore}
                    unit="/100"
                    icon={Moon}
                    color={{ bg: "bg-indigo-500", text: "text-indigo-600" }}
                  />
                  <MetricCard
                    title="Treino"
                    value={latestLog.workoutMinutes}
                    unit="min"
                    icon={Activity}
                    color={{ bg: "bg-emerald-500", text: "text-emerald-600" }}
                  />
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                  <h3 className="text-lg font-bold text-slate-800 mb-4">
                    Evolução
                  </h3>
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
                              stopColor="#3b82f6"
                              stopOpacity={0.2}
                            />
                            <stop
                              offset="95%"
                              stopColor="#3b82f6"
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
                          stroke="#3b82f6"
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
                <div className="mb-6 p-4 bg-blue-50 rounded-xl border border-blue-100 flex items-center gap-3">
                  <User className="w-5 h-5 text-blue-600" />
                  <p className="text-sm text-blue-800 font-medium">
                    Registrando dados para:{" "}
                    <span className="font-bold">
                      {user.displayName || user.email}
                    </span>
                  </p>
                </div>
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
      {user && (
        <nav
          className={`fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 pb-safe pt-2 px-6 flex justify-around md:justify-center md:gap-12 z-20 ${
            mode === "doctor" ? "border-t-indigo-200 bg-indigo-50/50" : ""
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
            <p className="text-xs text-indigo-600 font-medium py-3">
              Modo Médico Ativo
            </p>
          )}
        </nav>
      )}
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
