// import type { ReplicaNode } from "@/types/replication";
// import { CheckCircle2, ChevronsUpDown, ChevronUp, Circle, Database, Eye, EyeOff, Hash, KeyRound, Server, Trash2, User } from "lucide-react";
// import { useState } from "react";
// type DbField = Exclude<keyof ReplicaNode, "id">;
// const FIELDS: {
//   key: DbField;
//   label: string;
//   placeholder: string;
//   icon: React.ElementType;
//   type?: string;
//   hint?: string;
//   colSpan?: string;
// }[] = [
//   {
//     key: "host",
//     label: "Host",
//     placeholder: "e.g. replica.example.com",
//     icon: Server,
//     colSpan: "md:col-span-3",
//     hint: "Hostname or IP of the replica server",
//   },
//   {
//     key: "port",
//     label: "Port",
//     placeholder: "5432",
//     icon: Hash,
//     type: "number",
//     colSpan: "md:col-span-2",
//     hint: "Default PostgreSQL port is 5432",
//   },
//   {
//     key: "database",
//     label: "Database Name",
//     placeholder: "e.g. replica_db",
//     icon: Database,
//     colSpan: "md:col-span-2",
//     hint: "Database name on the replica node",
//   },
//   {
//     key: "username",
//     label: "Username",
//     placeholder: "e.g. replicator",
//     icon: User,
//     colSpan: "md:col-span-2",
//     hint: "Must have REPLICATION privilege",
//   },
//   {
//     key: "password",
//     label: "Password",
//     placeholder: "••••••••",
//     icon: KeyRound,
//     type: "password",
//     colSpan: "md:col-span-1",
//     hint: "Stored encrypted at rest",
//   },
// ];
// export  function ReplicaCard({
//   replica,
//   index,
//   onRemove,
//   onChange,
// }: {
//   replica: ReplicaNode;
//   index: number;
//   onRemove: () => void;
//   onChange: (field: keyof ReplicaNode, value: string | number) => void;
// }) {
//   const [collapsed, setCollapsed] = useState(false);
//   const [showPassword, setShowPassword] = useState(false);
//   const [focused, setFocused] = useState<DbField | null>(null);
//   const [touched, setTouched] = useState<Partial<Record<DbField, boolean>>>({});
//   const [confirmDelete, setConfirmDelete] = useState(false);

//   const isFilled = (key: DbField) =>
//     replica[key] !== "" && replica[key] !== 0 && replica[key] !== undefined;

//   const filledCount = FIELDS.filter((f) => isFilled(f.key)).length;
//   const progress = Math.round((filledCount / FIELDS.length) * 100);

//   const REPLICA_COLORS = [
//     { accent: "#3b82f6", light: "#dbeafe", mid: "#93c5fd", label: "blue" },
//     { accent: "#8b5cf6", light: "#ede9fe", mid: "#c4b5fd", label: "violet" },
//     { accent: "#f59e0b", light: "#fef3c7", mid: "#fcd34d", label: "amber" },
//     { accent: "#ec4899", light: "#fce7f3", mid: "#f9a8d4", label: "pink" },
//     { accent: "#06b6d4", light: "#cffafe", mid: "#67e8f9", label: "cyan" },
//   ];
//   const color = REPLICA_COLORS[index % REPLICA_COLORS.length];

//   return (
//     <div
//       className="rounded-2xl border bg-white shadow-sm transition-all"
//       style={{ borderColor: focused ? color.mid : "#e2e8f0" }}
//     >
//       {/* Card Header */}
//       <div
//         className="flex items-center justify-between px-5 py-3.5 rounded-t-2xl border-b border-slate-100 cursor-pointer select-none"
//         style={{ backgroundColor: `${color.light}50` }}
//         onClick={() => setCollapsed((c) => !c)}
//       >
//         <div className="flex items-center gap-3">
//           {/* Index badge */}
//           <div
//             className="flex h-7 w-7 items-center justify-center rounded-full text-[12px] font-bold text-white shrink-0"
//             style={{ backgroundColor: color.accent }}
//           >
//             {index + 1}
//           </div>
//           <div>
//             <p className="text-sm font-semibold text-slate-700 leading-tight">
//               Replica Node {index + 1}
//               {replica.host && (
//                 <span className="ml-2 font-normal text-slate-400 text-[12px]">
//                   — {replica.host}
//                   {replica.port ? `:${replica.port}` : ""}
//                 </span>
//               )}
//             </p>
//             {/* Mini progress */}
//             <div className="mt-1 flex items-center gap-1.5">
//               <div className="h-1 w-16 rounded-full bg-slate-200 overflow-hidden">
//                 <div
//                   className="h-full rounded-full transition-all duration-500"
//                   style={{
//                     width: `${progress}%`,
//                     backgroundColor: progress === 100 ? "#10b981" : color.accent,
//                   }}
//                 />
//               </div>
//               <span className="text-[10px] text-slate-400 font-medium">
//                 {filledCount}/{FIELDS.length}
//               </span>
//             </div>
//           </div>
//         </div>

//         <div className="flex items-center gap-2">
//           {/* Delete */}
//           {confirmDelete ? (
//             <div className="flex items-center gap-1.5">
//               <span className="text-[11px] text-red-500 font-medium">Remove?</span>
//               <button
//                 onClick={(e) => { e.stopPropagation(); onRemove(); }}
//                 className="rounded-md bg-red-500 px-2 py-0.5 text-[11px] font-semibold text-white hover:bg-red-600 transition-colors"
//               >
//                 Yes
//               </button>
//               <button
//                 onClick={(e) => { e.stopPropagation(); setConfirmDelete(false); }}
//                 className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-500 hover:bg-slate-50 transition-colors"
//               >
//                 No
//               </button>
//             </div>
//           ) : (
//             <button
//               onClick={(e) => { e.stopPropagation(); setConfirmDelete(true); }}
//               className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 hover:border-red-200 hover:text-red-400 transition-all"
//             >
//               <Trash2 className="h-3.5 w-3.5" />
//             </button>
//           )}
//           {/* Collapse toggle */}
//           <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400">
//             {collapsed ? (
//               <ChevronsUpDown className="h-3.5 w-3.5" />
//             ) : (
//               <ChevronUp className="h-3.5 w-3.5" />
//             )}
//           </div>
//         </div>
//       </div>

//       {/* Fields */}
//       {!collapsed && (
//         <div className="p-5">
//           <div className="grid grid-cols-1 md:grid-cols-5 gap-x-4 gap-y-5">
//             {FIELDS.map((field) => {
//               const Icon = field.icon;
//               const isFocused = focused === field.key;
//               const isFilledField = isFilled(field.key);
//               const isTouched = touched[field.key];
//               const isPassword = field.type === "password";

//               return (
//                 <div
//                   key={field.key}
//                   className={`flex flex-col gap-1.5 ${field.colSpan ?? ""}`}
//                 >
//                   <div className="flex items-center justify-between">
//                     <label className="flex items-center gap-1.5 text-[12px] font-semibold text-slate-600">
//                       <Icon
//                         className="h-3.5 w-3.5"
//                         style={{ color: isFocused ? color.accent : "#94a3b8" }}
//                       />
//                       {field.label}
//                     </label>
//                     {isTouched &&
//                       (isFilledField ? (
//                         <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
//                       ) : (
//                         <Circle className="h-3.5 w-3.5 text-slate-300" />
//                       ))}
//                   </div>

//                   <div className="relative">
//                     <input
//                       type={
//                         isPassword && !showPassword
//                           ? "password"
//                           : isPassword
//                           ? "text"
//                           : field.type ?? "text"
//                       }
//                       placeholder={field.placeholder}
//                       value={replica[field.key]}
//                       onFocus={() => setFocused(field.key)}
//                       onBlur={() => {
//                         setFocused(null);
//                         setTouched((t) => ({ ...t, [field.key]: true }));
//                       }}
//                       onChange={(e) =>
//                         onChange(
//                           field.key,
//                           field.key === "port"
//                             ? Number(e.target.value)
//                             : e.target.value
//                         )
//                       }
//                       className="w-full rounded-lg border px-3 py-2.5 text-sm text-slate-800 placeholder-slate-300 outline-none transition-all"
//                       style={{
//                         borderColor: isFocused
//                           ? color.accent
//                           : isFilledField && isTouched
//                           ? "#86efac"
//                           : "#e2e8f0",
//                         backgroundColor: isFocused
//                           ? `${color.light}60`
//                           : "#f8fafc",
//                         boxShadow: isFocused
//                           ? `0 0 0 3px ${color.accent}20`
//                           : "none",
//                         paddingRight: isPassword ? "2.5rem" : undefined,
//                       }}
//                     />
//                     {isPassword && (
//                       <button
//                         type="button"
//                         onClick={() => setShowPassword((s) => !s)}
//                         className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
//                       >
//                         {showPassword ? (
//                           <EyeOff className="h-4 w-4" />
//                         ) : (
//                           <Eye className="h-4 w-4" />
//                         )}
//                       </button>
//                     )}
//                   </div>

//                   {field.hint && isFocused && (
//                     <p
//                       className="text-[11px] leading-snug"
//                       style={{ color: color.accent }}
//                     >
//                       {field.hint}
//                     </p>
//                   )}
//                 </div>
//               );
//             })}
//           </div>

//           {/* Connection preview */}
//           {filledCount >= 3 && (
//             <div className="mt-5 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
//               <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
//                 Connection String Preview
//               </p>
//               <code className="font-mono text-[12px] text-slate-600 break-all">
//                 postgresql://
//                 <span style={{ color: color.accent }}>
//                   {replica.username || "user"}
//                 </span>
//                 :
//                 <span className="text-slate-400">
//                   {"*".repeat(replica.password ? 8 : 4)}
//                 </span>
//                 @
//                 <span className="text-emerald-600">
//                   {replica.host || "host"}
//                 </span>
//                 :
//                 <span className="text-amber-600">{replica.port || 5432}</span>
//                 /
//                 <span className="text-violet-600">
//                   {replica.database || "dbname"}
//                 </span>
//               </code>
//             </div>
//           )}
//         </div>
//       )}
//     </div>
//   );
// }