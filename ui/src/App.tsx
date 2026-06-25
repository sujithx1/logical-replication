import { useEffect, useMemo, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import {
  Play,
  Square,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Database,
  Server,
  Trash2,
  Lock,
  User as UserIcon,
  Phone,
  LogOut,
  List,
  Plus,
  ArrowLeft,
  Shield
} from "lucide-react";

import ReplicationTypeSelector from "@/components/replication/replication-type-selector";
import PrimaryDbForm from "@/components/replication/primary-db-form";
import ReplicaList from "@/components/replication/replica-list";
import DockerPreview from "@/components/replication/docker-preview";
import PostgresConfigPreview from "@/components/replication/config-preview";

import { generateDockerCompose } from "@/lib/docker";
import { generatePostgresConfig } from "@/lib/pg-config";
import { api } from "@/lib/api";
import type {
  DbConfig,
  ReplicaNode,
  ReplicationType,
} from "./types/replication";

interface User {
  id: string;
  username: string;
  phone_number: string;
  role: "admin" | "user";
}

const defaultPrimary: DbConfig = {
  host: "localhost",
  port: 5432,
  user: "sujith",
  password: "Sujith@123",
  database: "primary_db",
};

const createReplica = (): ReplicaNode => ({
  id: uuidv4(),
  host: "localhost",
  port: 5433,
  user: "sujith",
  password: "Sujith@123",
  database: "replica_db",
  subscription_name: "pg_logical_replication",
});

export default function App() {
  // Auth State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authForm, setAuthForm] = useState({
    username: "",
    phone_number: "",
    password: "",
    role: "user" as "user" | "admin",
  });

  // Replication Config state
  const [view, setView] = useState<"list" | "create" | "details">("list");
  const [type, setType] = useState<ReplicationType>("logical");
  const [primary, setPrimary] = useState<DbConfig>(defaultPrimary);
  const [replicas, setReplicas] = useState<ReplicaNode[]>([createReplica()]);
  const [publicationName, setPublicationName] = useState("pg_logical_replication");

  // Dashboard List state
  const [replicationsList, setReplicationsList] = useState<any[]>([]);
  const [selectedSetup, setSelectedSetup] = useState<any | null>(null);

  // API states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [statusData, setStatusData] = useState<any | null>(null);

  // Check login on mount
  useEffect(() => {
    const savedUser = localStorage.getItem("replication_user");
    const savedToken = localStorage.getItem("replication_token");
    if (savedUser && savedToken) {
      setCurrentUser(JSON.parse(savedUser));
    }
  }, []);

  // Fetch list of setups when logged in or view changes to list
  useEffect(() => {
    if (currentUser && (view === "list" || view === "details")) {
      handleListReplications();
    }
  }, [currentUser, view]);

  const addReplica = () => {
    setReplicas((prev) => [...prev, createReplica()]);
  };

  const removeReplica = (id: string) => {
    setReplicas((prev) => prev.filter((r) => r.id !== id));
  };

  const updateReplica = (
    id: string,
    field: keyof ReplicaNode,
    value: string | number,
  ) => {
    setReplicas((prev) =>
      prev.map((replica) =>
        replica.id === id
          ? {
              ...replica,
              [field]: value,
            }
          : replica,
      ),
    );
  };

  const postgresConfig = generatePostgresConfig(type);

  const dockerCompose = useMemo(() => {
    return generateDockerCompose(primary, replicas);
  }, [primary, replicas]);

  const getSecondaryConfigs = () => {
    return replicas.map(({ id, ...rest }) => rest);
  };

  const clearAlerts = () => {
    setError(null);
    setSuccess(null);
  };

  // Auth Handlers
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearAlerts();
    setLoading(true);
    try {
      if (authMode === "login") {
        const response = await api.post("/auth/login", {
          username: authForm.username,
          password: authForm.password,
        });
        localStorage.setItem("replication_token", response.data.token);
        localStorage.setItem("replication_user", JSON.stringify(response.data.user));
        setCurrentUser(response.data.user);
        setSuccess("Logged in successfully!");
      } else {
        await api.post("/auth/register", {
          username: authForm.username,
          phone_number: authForm.phone_number,
          password: authForm.password,
          role: authForm.role,
        });
        setSuccess("Registered successfully! You can now log in.");
        setAuthMode("login");
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("replication_token");
    localStorage.removeItem("replication_user");
    setCurrentUser(null);
    setStatusData(null);
    setSelectedSetup(null);
    setView("list");
  };

  // Replication Handlers
  const handleCreateReplication = async () => {
    clearAlerts();
    setLoading(true);
    try {
      await api.post("/create", {
        primary,
        secondary: getSecondaryConfigs(),
        publication_name: publicationName,
      });
      setSuccess("Logical replication setup created successfully!");
      setView("list");
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || "Failed to create replication");
    } finally {
      setLoading(false);
    }
  };

  const handleListReplications = async () => {
    try {
      const response = await api.post("/list", {});
      setReplicationsList(response.data.replications || []);
    } catch (err: any) {
      console.error("Failed to list configurations:", err);
    }
  };

  const handleGetStatus = async (setupId: string) => {
    clearAlerts();
    setLoading(true);
    try {
      const response = await api.post("/status", { setup_id: setupId });
      setStatusData(response.data);
      setSuccess("Replication status updated.");
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || "Failed to fetch status");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteReplication = async (setupId: string) => {
    if (!window.confirm("Are you sure you want to stop and delete all publications and subscriptions? This will clean up replication slots on primary.")) {
      return;
    }
    clearAlerts();
    setLoading(true);
    try {
      await api.post("/delete", { setup_id: setupId });
      setSuccess("Replication setup torn down successfully!");
      setStatusData(null);
      setSelectedSetup(null);
      setView("list");
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || "Failed to delete replication setup");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSubscription = async (setupId: string, replicaDb: string, action: "enable" | "disable") => {
    clearAlerts();
    setLoading(true);
    try {
      await api.post("/update-subscription", {
        setup_id: setupId,
        database: replicaDb,
        action,
      });
      setSuccess(`Subscription ${action}d successfully on ${replicaDb}`);
      await handleGetStatus(setupId);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || "Failed to toggle subscription");
    } finally {
      setLoading(false);
    }
  };

  // Auth Screen Render
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full border border-slate-800 bg-slate-900/50 backdrop-blur rounded-3xl p-8 space-y-6 shadow-2xl">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500 tracking-tight">
              PostgreSQL Replication
            </h1>
            <p className="text-sm text-slate-400">
              {authMode === "login" ? "Sign in to access replication dashboard" : "Register a new cluster credentials profile"}
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-3 rounded-xl border border-red-950/50 bg-red-950/20 px-4 py-3 text-xs text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="flex items-center gap-3 rounded-xl border border-emerald-950/50 bg-emerald-950/20 px-4 py-3 text-xs text-emerald-400">
              <CheckCircle className="h-4 w-4 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                <UserIcon className="h-3.5 w-3.5" />
                Username
              </label>
              <input
                type="text"
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                placeholder="Enter username"
                value={authForm.username}
                onChange={(e) => setAuthForm({ ...authForm, username: e.target.value })}
              />
            </div>

            {authMode === "register" && (
              <>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5" />
                    Phone Number
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                    placeholder="Enter phone number"
                    value={authForm.phone_number}
                    onChange={(e) => setAuthForm({ ...authForm, phone_number: e.target.value })}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                    <Shield className="h-3.5 w-3.5" />
                    Profile Role
                  </label>
                  <select
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                    value={authForm.role}
                    onChange={(e) => setAuthForm({ ...authForm, role: e.target.value as any })}
                  >
                    <option value="user">User (Own setups only)</option>
                    <option value="admin">Admin (View all setups, masked passwords)</option>
                  </select>
                </div>
              </>
            )}

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5" />
                Password
              </label>
              <input
                type="password"
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                placeholder="Enter password"
                value={authForm.password}
                onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 py-3 text-sm font-semibold rounded-xl text-white transition-all shadow-lg active:scale-95 cursor-pointer mt-6"
            >
              {loading ? "Processing..." : authMode === "login" ? "Sign In" : "Register"}
            </button>
          </form>

          <div className="text-center">
            <button
              type="button"
              className="text-xs text-blue-400 hover:underline"
              onClick={() => setAuthMode(authMode === "login" ? "register" : "login")}
            >
              {authMode === "login" ? "Don't have an account? Register" : "Already have an account? Sign In"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Dashboard Screen Render
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6 md:p-10 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-800 pb-6 gap-4">
          <div>
            <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-500 tracking-tight">
              PostgreSQL Replication Dashboard
            </h1>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-slate-400 text-sm">Logged in as: </span>
              <span className="text-blue-400 font-bold text-sm font-mono">{currentUser.username}</span>
              <span className="text-slate-600 text-sm">|</span>
              <span className="bg-indigo-950 border border-indigo-900/50 text-indigo-400 text-[10px] uppercase font-bold px-2 py-0.5 rounded">
                {currentUser.role}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 border border-red-950 bg-red-950/20 text-red-400 hover:bg-red-950/40 rounded-xl px-4 py-2 text-sm font-semibold transition-all cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        </div>

        {/* View Router */}
        {view === "list" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                  <List className="h-6 w-6 text-blue-400" />
                  Your Replication Clusters
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  {currentUser.role === "admin" ? "Admin Mode: Viewing all registered setups (passwords masked)" : "Manage and check status of your active setups"}
                </p>
              </div>
              <button
                onClick={() => {
                  setView("create");
                  clearAlerts();
                }}
                className="flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all active:scale-95 cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                Configure New Setup
              </button>
            </div>

            {replicationsList.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-800 bg-slate-950/20 py-16 text-center">
                <Database className="h-12 w-12 text-slate-600 mb-3" />
                <p className="text-sm font-semibold text-slate-400">No replication configurations found</p>
                <p className="text-xs text-slate-600 mt-1">Configure your first replication cluster to get started.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {replicationsList.map((setup) => (
                  <div
                    key={setup.id}
                    onClick={() => {
                      setSelectedSetup(setup);
                      setView("details");
                      handleGetStatus(setup.id);
                    }}
                    className="border border-slate-800 hover:border-slate-700 bg-slate-950/40 backdrop-blur rounded-2xl p-5 space-y-4 shadow-lg cursor-pointer transition-all hover:-translate-y-0.5"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-lg text-white font-mono">{setup.publication_name}</h3>
                        {currentUser.role === "admin" && (
                          <p className="text-xs text-slate-500">Owner: {setup.owner}</p>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {new Date(setup.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                      <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                        <span className="text-[10px] font-bold text-blue-400 block mb-1">PRIMARY</span>
                        <p className="text-slate-300 truncate">{setup.primary.database}</p>
                        <p className="text-slate-500 truncate">{setup.primary.host}:{setup.primary.port}</p>
                      </div>

                      <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                        <span className="text-[10px] font-bold text-indigo-400 block mb-1">REPLICAS</span>
                        <p className="text-slate-300 truncate">{setup.secondary?.length || 0} target nodes</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {view === "create" && (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setView("list")}
                className="flex items-center justify-center h-10 w-10 border border-slate-800 rounded-xl hover:bg-slate-800 cursor-pointer"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h2 className="text-2xl font-bold text-white tracking-tight">Configure New Replication</h2>
                <p className="text-xs text-slate-400 mt-1">Specify credentials and schema definitions to setup a live stream</p>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-3 rounded-xl border border-red-950/50 bg-red-950/20 px-4 py-3 text-sm text-red-400">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <PostgresConfigPreview
                title={postgresConfig.title}
                description={postgresConfig.description}
                command={postgresConfig.command}
              />
              <DockerPreview value={dockerCompose} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
              <div className="space-y-6">
                <ReplicationTypeSelector value={type} onChange={setType} />
                <PrimaryDbForm value={primary} onChange={setPrimary} />
              </div>
              <div>
                <ReplicaList
                  replicas={replicas}
                  addReplica={addReplica}
                  removeReplica={removeReplica}
                  updateReplica={updateReplica}
                />
              </div>
            </div>

            <div className="border border-slate-800 bg-slate-950/40 backdrop-blur rounded-2xl p-6 space-y-4 shadow-xl">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="font-bold text-lg text-white">Publication Profile settings</h3>
                  <p className="text-xs text-slate-400 mt-1">Configure unique identification for PostgreSQL logical replication slots</p>
                </div>
                <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5">
                  <span className="text-xs font-semibold text-slate-400 uppercase">Pub Name:</span>
                  <input
                    type="text"
                    className="bg-transparent text-sm font-mono font-bold text-blue-400 focus:outline-none w-48"
                    value={publicationName}
                    onChange={(e) => setPublicationName(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-4 border-t border-slate-800">
                <button
                  onClick={handleCreateReplication}
                  disabled={loading || replicas.length === 0}
                  className="flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 px-6 py-3 text-sm font-semibold text-white transition-all shadow-lg active:scale-95 cursor-pointer"
                >
                  <Play className="h-4 w-4" />
                  Initiate Setup
                </button>
                <button
                  onClick={() => setView("list")}
                  className="flex items-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 px-6 py-3 text-sm font-semibold text-white transition-all border border-slate-700 active:scale-95 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {view === "details" && selectedSetup && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setView("list")}
                  className="flex items-center justify-center h-10 w-10 border border-slate-800 rounded-xl hover:bg-slate-800 cursor-pointer"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div>
                  <h2 className="text-2xl font-bold text-white font-mono">{selectedSetup.publication_name}</h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Setup UUID: {selectedSetup.id} {selectedSetup.owner && `| Owner: ${selectedSetup.owner}`}
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleGetStatus(selectedSetup.id)}
                  disabled={loading}
                  className="flex items-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 px-4 py-2 text-sm font-semibold text-white transition-all border border-slate-700 active:scale-95 cursor-pointer"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>

                <button
                  onClick={() => handleDeleteReplication(selectedSetup.id)}
                  disabled={loading}
                  className="flex items-center gap-2 rounded-xl bg-red-950/40 hover:bg-red-900/40 border border-red-900/60 disabled:opacity-50 px-4 py-2 text-sm font-semibold text-red-400 transition-all active:scale-95 cursor-pointer"
                >
                  <Trash2 className="h-4 w-4" />
                  Teardown
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-3 rounded-xl border border-red-950/50 bg-red-950/20 px-4 py-3 text-sm text-red-400">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            {success && (
              <div className="flex items-center gap-3 rounded-xl border border-emerald-950/50 bg-emerald-950/20 px-4 py-3 text-sm text-emerald-400">
                <CheckCircle className="h-5 w-5 shrink-0" />
                <span>{success}</span>
              </div>
            )}

            {/* Connection Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="border border-slate-800 bg-slate-950/40 backdrop-blur rounded-2xl p-5 space-y-3">
                <h3 className="font-bold text-sm uppercase tracking-wider text-blue-400">Primary Server Details</h3>
                <div className="text-xs font-mono space-y-1.5 text-slate-300">
                  <p><span className="text-slate-500">Host:</span> {selectedSetup.primary.host}</p>
                  <p><span className="text-slate-500">Port:</span> {selectedSetup.primary.port}</p>
                  <p><span className="text-slate-500">User:</span> {selectedSetup.primary.user}</p>
                  <p><span className="text-slate-500">Password:</span> {selectedSetup.primary.password}</p>
                  <p><span className="text-slate-500">Database:</span> {selectedSetup.primary.database}</p>
                </div>
              </div>

              <div className="border border-slate-800 bg-slate-950/40 backdrop-blur rounded-2xl p-5 space-y-3">
                <h3 className="font-bold text-sm uppercase tracking-wider text-indigo-400">Target Replicas</h3>
                <div className="space-y-4">
                  {selectedSetup.secondary?.map((rep: any, i: number) => (
                    <div key={i} className="text-xs font-mono space-y-1 text-slate-300 border-b border-slate-800 pb-2 last:border-0 last:pb-0">
                      <p className="font-bold text-white text-sm">{rep.database}</p>
                      <p><span className="text-slate-500">Subscription:</span> {rep.subscription_name}</p>
                      <p><span className="text-slate-500">Endpoint:</span> {rep.host}:{rep.port}</p>
                      <p><span className="text-slate-500">User:</span> {rep.user}</p>
                      <p><span className="text-slate-500">Password:</span> {rep.password}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Live Status Output Section */}
            {statusData && (
              <div className="space-y-6 pt-4 border-t border-slate-800">
                <h3 className="text-lg font-bold text-slate-200">Replication Logs & Stats</h3>

                {/* Primary DB Status */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* pg_stat_replication */}
                  <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 space-y-3">
                    <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Server className="h-3.5 w-3.5" />
                      Primary Stats (pg_stat_replication)
                    </h4>
                    {statusData.primary?.stat_replication?.length === 0 ? (
                      <p className="text-xs text-slate-500 italic">No active subscribers connected.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs font-mono">
                          <thead>
                            <tr className="text-slate-400 border-b border-slate-800">
                              <th className="py-2">App Name</th>
                              <th className="py-2">Client IP</th>
                              <th className="py-2">State</th>
                              <th className="py-2">Lag (Replay)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/50">
                            {statusData.primary?.stat_replication?.map((row: any, i: number) => (
                              <tr key={i} className="text-slate-300">
                                <td className="py-2 font-semibold text-blue-400">{row.application_name}</td>
                                <td className="py-2 text-slate-400">{row.client_addr || "127.0.0.1"}</td>
                                <td className="py-2">
                                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-indigo-950/60 text-indigo-400 border border-indigo-900/50">
                                    {row.state}
                                  </span>
                                </td>
                                <td className="py-2 text-amber-500">{row.replay_lag || "00:00:00"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* pg_replication_slots */}
                  <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 space-y-3">
                    <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Database className="h-3.5 w-3.5" />
                      Active WAL Slots (pg_replication_slots)
                    </h4>
                    {statusData.primary?.replication_slots?.length === 0 ? (
                      <p className="text-xs text-slate-500 italic">No replication slots found.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs font-mono">
                          <thead>
                            <tr className="text-slate-400 border-b border-slate-800">
                              <th className="py-2">Slot Name</th>
                              <th className="py-2">Type</th>
                              <th className="py-2">Active</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/50">
                            {statusData.primary?.replication_slots?.map((row: any, i: number) => (
                              <tr key={i} className="text-slate-300">
                                <td className="py-2 text-violet-400">{row.slot_name}</td>
                                <td className="py-2 text-slate-400">{row.slot_type}</td>
                                <td className="py-2">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${row.active ? 'bg-emerald-950 text-emerald-400 border border-emerald-900/50' : 'bg-red-950 text-red-400 border border-red-900/50'}`}>
                                    {row.active ? "ACTIVE" : "INACTIVE"}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                </div>

                {/* Replica Subscription Details */}
                <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 space-y-4">
                  <h4 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Replica Subscription States</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {statusData.secondary?.map((rep: any, idx: number) => (
                      <div key={idx} className="border border-slate-800/60 bg-slate-950/60 rounded-xl p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-blue-400">{rep.database}</span>
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold ${rep.details?.subenabled ? 'bg-emerald-950/60 text-emerald-400' : 'bg-amber-950/60 text-amber-500'}`}>
                            {rep.details?.subenabled ? "Enabled" : "Disabled / Missing"}
                          </span>
                        </div>

                        {rep.connected === false ? (
                          <p className="text-xs text-red-400">Connection Error: {rep.error}</p>
                        ) : (
                          <div className="text-xs font-mono space-y-1 text-slate-400">
                            <p><span className="text-slate-500">Subscription:</span> {rep.subscription_name}</p>
                            <p><span className="text-slate-500">Worker PID:</span> {rep.status?.pid || "N/A"}</p>
                            <p><span className="text-slate-500">Received LSN:</span> {rep.status?.received_lsn || "N/A"}</p>
                          </div>
                        )}

                        {/* Enable/Disable buttons for this subscriber */}
                        {rep.connected && rep.details && (
                          <div className="flex gap-2 pt-2 border-t border-slate-900">
                            {rep.details.subenabled ? (
                              <button
                                onClick={() => handleToggleSubscription(selectedSetup.id, rep.database, "disable")}
                                className="flex items-center gap-1.5 rounded-lg border border-amber-900/60 bg-amber-950/30 px-3 py-1 text-xs font-semibold text-amber-500 hover:bg-amber-950/50 cursor-pointer"
                              >
                                <Square className="h-3 w-3" />
                                Disable Replication
                              </button>
                            ) : (
                              <button
                                onClick={() => handleToggleSubscription(selectedSetup.id, rep.database, "enable")}
                                className="flex items-center gap-1.5 rounded-lg border border-emerald-900/60 bg-emerald-950/30 px-3 py-1 text-xs font-semibold text-emerald-500 hover:bg-emerald-950/50 cursor-pointer"
                              >
                                <Play className="h-3 w-3" />
                                Enable Replication
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
