import React from 'react';
import {
  CheckCircle2,
  KeyRound,
  Lock,
  Plus,
  ShieldCheck,
  Trash2,
  UserCheck,
  Users,
} from 'lucide-react';
import { Employee } from '../../types';

interface EmployeeMgmtTabProps {
  employees: Employee[];
  adminPass: string;
  onOpenAddEmployeeModal: () => void;
  onOpenEditEmployeeModal: (emp: Employee) => void;
  onOpenChangeAdminPassModal: () => void;
  onDeleteEmployee: (empId: string) => void;
}

export const EmployeeMgmtTab: React.FC<EmployeeMgmtTabProps> = ({
  employees,
  adminPass,
  onOpenAddEmployeeModal,
  onOpenEditEmployeeModal,
  onOpenChangeAdminPassModal,
  onDeleteEmployee,
}) => {
  return (
    <div className="p-6 rounded-3xl bg-surface backdrop-blur-xl border border-border shadow-xl space-y-5 text-text">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-border pb-4 flex-wrap gap-4">
        <div>
          <h3 className="text-base font-bold text-text flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-pink-500/20 border border-pink-500/30 flex items-center justify-center text-pink-400">
              <Users className="w-4 h-4" />
            </div>
            <span>Employee & Admin Access Control</span>
          </h3>
          <p className="text-xs text-text-muted mt-1">
            Configure employee PIN passwords, designate responsibilities, and manage master administrative credentials.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={onOpenChangeAdminPassModal}
            className="bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 px-3.5 py-2 rounded-2xl text-xs font-semibold flex items-center gap-1.5 backdrop-blur-md transition cursor-pointer"
          >
            <KeyRound className="w-3.5 h-3.5 text-primary" />
            <span>Change Master Admin Password</span>
          </button>

          <button
            onClick={onOpenAddEmployeeModal}
            className="bg-pink-600 hover:bg-pink-500 text-text px-4 py-2 rounded-2xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-pink-600/30 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add New Employee</span>
          </button>
        </div>
      </div>

      {/* Admin Master Key Status Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-primary/10 to-surface border border-primary/25 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-text">Administrator Security Master Key</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
                <CheckCircle2 className="w-3 h-3" /> Auto-Saved & Active
              </span>
            </div>
            <p className="text-[11px] text-text-muted mt-0.5">
              This master password protects system reset, offline backups, sensitive overrides, and terminal authentication.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-xl bg-surface-elevated border border-border font-mono text-xs text-primary flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-primary" />
            <span>••••••••</span>
          </div>
          <button
            onClick={onOpenChangeAdminPassModal}
            className="text-xs font-semibold text-primary hover:text-text underline underline-offset-2 transition"
          >
            Update Password
          </button>
        </div>
      </div>

      {/* Employee Roster Table */}
      <div className="overflow-x-auto border border-border rounded-2xl bg-surface backdrop-blur-md">
        <table className="w-full text-left border-collapse text-xs">
          <thead className="bg-surface-elevated border-b border-border font-semibold text-text-muted text-[11px] uppercase">
            <tr>
              <th className="p-3.5">Employee Name</th>
              <th className="p-3.5">Designation / Role</th>
              <th className="p-3.5 text-primary font-bold">Login Password / PIN</th>
              <th className="p-3.5">Permitted Modules</th>
              <th className="p-3.5 text-center">Actions</th>
            </tr>
          </thead>
          <tbody id="employee-table-rows" className="divide-y divide-border text-text">
            {employees.map(e => (
              <tr key={e.id} className="hover:bg-surface transition">
                <td className="p-3.5">
                  <span className="font-bold text-text block">{e.name}</span>
                  <span className="text-[10px] text-text-muted font-mono">ID: {e.id}</span>
                </td>
                <td className="p-3.5 text-text-muted font-medium">{e.desig}</td>
                <td className="p-3.5">
                  <div className="inline-flex items-center gap-2 bg-primary/20 border border-primary/30 px-3 py-1 rounded-xl">
                    <Lock className="w-3 h-3 text-primary" />
                    <span className="font-mono font-bold text-primary text-xs tracking-wider">
                      {e.pass}
                    </span>
                  </div>
                </td>
                <td className="p-3.5">
                  <span className="bg-surface-elevated text-text border border-border px-3 py-1 rounded-full font-medium text-[11px]">
                    {e.permissions.length} Modules Authorized
                  </span>
                </td>
                <td className="p-3.5 text-center space-x-2">
                  <button
                    onClick={() => onOpenEditEmployeeModal(e)}
                    className="text-primary font-semibold hover:text-text bg-primary/20 px-3 py-1.5 rounded-xl border border-primary/30 transition backdrop-blur-sm cursor-pointer"
                  >
                    Edit Permissions
                  </button>
                  <button
                    onClick={() => onDeleteEmployee(e.id)}
                    className="text-rose-300 font-semibold hover:text-text bg-rose-500/20 px-3 py-1.5 rounded-xl border border-rose-500/30 transition backdrop-blur-sm cursor-pointer"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
