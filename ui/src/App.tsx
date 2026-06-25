import { useMemo, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import {
  Play,
  Square,
  Activity,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Database,
  Server,
  Trash2
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
  const [type, setType] = useState<ReplicationType>("logical");
  const [primary, setPrimary] = useState<DbConfig>(defaultPrimary);
  const [replicas, setReplicas] = useState<ReplicaNode[]>([createReplica()]);
  const [publicationName, setPublicationName] = useState("pg_logical_replication");

  // API Call States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [statusData, setStatusData] = useState<any | null>(null);

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

  // Clean secondary replica configs for API calls (removing the local UI UUID field)
  const getSecondaryConfigs = () => {
    return replicas.map(({ id, ...rest }) => rest);
  };

  // Helper to clear feedback alerts
  const clearAlerts = () => {
    setError(null);
    setSuccess(null);
  };

  // Actions
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
      // Automatically refresh status after creation
      await handleGetStatus();
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleGetStatus = async () => {
    clearAlerts();
    setLoading(true);
    try {
      const response = await api.post("/status", {
        primary,
        secondary: getSecondaryConfigs(),
        publication_name: publicationName,
      });
      
      setStatusData(response.data);
      setSuccess("Replication status updated.");
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteReplication = async () => {
    if (!window.confirm("Are you sure you want to stop and delete all publications and subscriptions? This will clean up replication slots on primary.")) {
      return;
    }
    clearAlerts();
    setLoading(true);
    try {
      await api.post("/delete", {
        primary,
        secondary: getSecondaryConfigs(),
        publication_name: publicationName,
      });
      
      setSuccess("Replication setup torn down successfully!");
      setStatusData(null);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSubscription = async (replica: ReplicaNode, action: "enable" | "disable") => {
    clearAlerts();
    setLoading(true);
    try {
      const { id, ...replicaConfig } = replica;
      await api.post("/update-subscription", {
        replica: replicaConfig,
        action,
      });
      
      setSuccess(`Subscription ${action}d successfully on ${replica.database}`);
      // Refresh status to show the updated state
      await handleGetStatus();
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6 md:p-10 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-800 pb-6 gap-4">
          <div>
            <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-500 tracking-tight">
              PostgreSQL Replication Dashboard
            </h1>
            <p className="text-slate-400 mt-2">
              A dynamic control plane for logical replication and cluster administration
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <span className="text-sm font-semibold text-slate-300">Live Services</span>
          </div>
        </div>

        {/* Configurations Previews */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PostgresConfigPreview
            title={postgresConfig.title}
            description={postgresConfig.description}
            command={postgresConfig.command}
          />
          <DockerPreview value={dockerCompose} />
        </div>

        {/* Database Node Editors */}
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

        {/* Action & Dashboard Area */}
        <div className="border border-slate-800 bg-slate-950/40 backdrop-blur rounded-2xl p-6 space-y-6 shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                <Activity className="h-5 w-5 text-indigo-400" />
                Live Control & Replication CRUD Operations
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Trigger DML/DDL sync configurations on live postgres host containers
              </p>
            </div>
            
            {/* Publication Name Config */}
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 shrink-0">
              <span className="text-xs font-semibold text-slate-400 uppercase">Pub Name:</span>
              <input
                type="text"
                className="bg-transparent text-sm font-mono font-bold text-blue-400 focus:outline-none w-48"
                value={publicationName}
                onChange={(e) => setPublicationName(e.target.value)}
              />
            </div>
          </div>

          {/* Feedback Messages */}
          {error && (
            <div className="flex items-center gap-3 rounded-xl border border-red-900/50 bg-red-950/20 px-4 py-3 text-sm text-red-400">
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

          {/* Main Action Triggers */}
          <div className="flex flex-wrap gap-4">
            <button
              onClick={handleCreateReplication}
              disabled={loading || replicas.length === 0}
              className="flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 px-5 py-3 text-sm font-semibold text-white transition-all shadow-lg active:scale-95 cursor-pointer"
            >
              <Play className="h-4 w-4" />
              Setup Replication
            </button>
            
            <button
              onClick={handleGetStatus}
              disabled={loading}
              className="flex items-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 px-5 py-3 text-sm font-semibold text-white transition-all border border-slate-700 active:scale-95 cursor-pointer"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Check Replication Status
            </button>

            <button
              onClick={handleDeleteReplication}
              disabled={loading}
              className="flex items-center gap-2 rounded-xl bg-red-950/40 hover:bg-red-900/40 border border-red-900/60 disabled:opacity-50 px-5 py-3 text-sm font-semibold text-red-400 transition-all active:scale-95 cursor-pointer ml-auto"
            >
              <Trash2 className="h-4 w-4" />
              Teardown Setup
            </button>
          </div>

          {/* Live Status Output Section */}
          {statusData && (
            <div className="space-y-6 pt-4 border-t border-slate-900">
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
                              onClick={() => {
                                const originalReplica = replicas.find(r => r.database === rep.database);
                                if (originalReplica) handleToggleSubscription(originalReplica, "disable");
                              }}
                              className="flex items-center gap-1.5 rounded-lg border border-amber-900/60 bg-amber-950/30 px-3 py-1 text-xs font-semibold text-amber-500 hover:bg-amber-950/50 cursor-pointer"
                            >
                              <Square className="h-3 w-3" />
                              Disable Replication
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                const originalReplica = replicas.find(r => r.database === rep.database);
                                if (originalReplica) handleToggleSubscription(originalReplica, "enable");
                              }}
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

      </div>
    </div>
  );
}
