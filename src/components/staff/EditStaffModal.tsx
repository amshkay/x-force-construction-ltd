/**
 * Edit Staff Modal
 * Module 17 — Staff, Suppliers, Expenses & Basic Finance
 * XFORCE Construction Ltd / X-FORCE BRICKS
 *
 * Form modal to update existing staff member metadata, job title,
 * department, and assigned system role with anti-privilege escalation checks.
 */

import React, { useState, useEffect } from 'react';
import { X, Edit, Shield, Briefcase, Phone, UserCheck } from 'lucide-react';
import { StaffMember, UpdateStaffDTO, StaffDepartment, StaffEmploymentStatus } from '../../types/staff';
import { StaffRoleName } from '../../types/auth';
import { staffService } from '../../services/staff.service';
import { DEFAULT_STAFF_DEPARTMENTS } from '../../repositories/staff.repository';
import { DEFAULT_DB_ROLES } from '../../config/roles.config';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../ui/Toast';

interface EditStaffModalProps {
  staff: StaffMember | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const EditStaffModal: React.FC<EditStaffModalProps> = ({
  staff,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { profile, isAdministrator } = useAuth();
  const toast = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState<UpdateStaffDTO>({
    fullName: '',
    phone: '',
    roleName: 'sales_manager',
    jobTitle: '',
    department: 'sales',
    employmentStatus: 'full_time',
    emergencyContactName: '',
    emergencyContactPhone: '',
    notes: '',
  });

  useEffect(() => {
    if (staff) {
      setFormData({
        fullName: staff.fullName,
        phone: staff.phone,
        roleName: staff.roleName,
        jobTitle: staff.jobTitle,
        department: staff.department,
        employmentStatus: staff.employmentStatus,
        emergencyContactName: staff.emergencyContactName || '',
        emergencyContactPhone: staff.emergencyContactPhone || '',
        notes: staff.notes || '',
      });
    }
  }, [staff]);

  if (!isOpen || !staff) return null;

  const isSelf = profile?.id === staff.id;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    if (!formData.fullName?.trim()) {
      toast.error('Validation Error', 'Full Name is required.');
      return;
    }
    if (!formData.phone?.trim()) {
      toast.error('Validation Error', 'Phone number is required.');
      return;
    }
    if (!formData.jobTitle?.trim()) {
      toast.error('Validation Error', 'Job title is required.');
      return;
    }

    try {
      setIsSubmitting(true);
      await staffService.updateStaff(staff.id, formData, profile.id);
      toast.success(
        'Staff Profile Updated',
        `Successfully updated record for ${formData.fullName} (${staff.staffNumber}).`
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error('Update Failed', err.message || 'Could not update staff member.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-950 text-orange-600 dark:text-orange-400">
              <Edit className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Edit Staff Profile
                </h2>
                <span className="text-xs font-mono font-medium px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                  {staff.staffNumber}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Updating internal personnel metadata and operational department
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Read-only corporate email */}
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
            <span className="text-slate-500">Corporate Login Email:</span>
            <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">{staff.email}</span>
          </div>

          {/* Full Name & Job Title */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-orange-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Job Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.jobTitle}
                onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-orange-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Phone & Department */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Mobile Phone <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Department
              </label>
              <select
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value as StaffDepartment })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-orange-500 focus:outline-none"
              >
                {DEFAULT_STAFF_DEPARTMENTS.map((dept) => (
                  <option key={dept.code} value={dept.code}>
                    {dept.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Role (anti-self-escalation) & Employment status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Assigned Role (RBAC)
              </label>
              {isSelf && !isAdministrator() ? (
                <div className="px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-500">
                  {staff.roleDisplayName} (Self-role modification disabled)
                </div>
              ) : (
                <select
                  value={formData.roleName}
                  onChange={(e) => setFormData({ ...formData, roleName: e.target.value as StaffRoleName })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                >
                  {DEFAULT_DB_ROLES.map((r) => (
                    <option key={r.id} value={r.name}>
                      {r.display_name}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Employment Basis
              </label>
              <select
                value={formData.employmentStatus}
                onChange={(e) =>
                  setFormData({ ...formData, employmentStatus: e.target.value as StaffEmploymentStatus })
                }
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-orange-500 focus:outline-none"
              >
                <option value="full_time">Full-Time Staff</option>
                <option value="part_time">Part-Time Staff</option>
                <option value="contract">Fixed Contract</option>
                <option value="probation">Probationary Period</option>
              </select>
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Emergency Contact Name
              </label>
              <input
                type="text"
                value={formData.emergencyContactName}
                onChange={(e) => setFormData({ ...formData, emergencyContactName: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-orange-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Emergency Contact Phone
              </label>
              <input
                type="tel"
                value={formData.emergencyContactPhone}
                onChange={(e) => setFormData({ ...formData, emergencyContactPhone: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-orange-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Internal Administrative Notes
            </label>
            <textarea
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-orange-500 focus:outline-none"
            />
          </div>

          {/* Form Actions */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-semibold bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition disabled:opacity-50 flex items-center gap-2 shadow-sm"
            >
              <UserCheck className="w-4 h-4" />
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
