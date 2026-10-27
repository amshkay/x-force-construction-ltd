import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { customerService } from '../../services/customer.service';
import { Customer, CustomerType } from '../../types/customer';
import { useAuth } from '../../hooks/useAuth';

interface PosCustomerQuickModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCustomerCreated: (customer: Customer) => void;
}

export const PosCustomerQuickModal: React.FC<PosCustomerQuickModalProps> = ({
  isOpen,
  onClose,
  onCustomerCreated,
}) => {
  const { profile } = useAuth();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [customerType, setCustomerType] = useState<CustomerType>('individual');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const valResult = customerService.validateCustomerData({
      fullName,
      phone,
      email: email || undefined,
    });

    if (!valResult.isValid) {
      setErrors(valResult.errors);
      return;
    }

    try {
      setIsSubmitting(true);
      const newCustomer = await customerService.createCustomer(
        {
          fullName: fullName.trim(),
          phone: phone.trim(),
          email: email.trim() || undefined,
          address: address.trim() || undefined,
          customerType,
          status: 'active',
          registrationSource: 'walk_in',
          notes: 'Registered at POS Counter',
        },
        profile?.id || 'cashier'
      );

      onCustomerCreated(newCustomer);
      onClose();
      // Reset form
      setFullName('');
      setPhone('');
      setEmail('');
      setAddress('');
      setCustomerType('individual');
    } catch (err: any) {
      setErrors({ form: err.message || 'Failed to register customer.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Quick Customer Registration"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-3.5">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Create a permanent customer profile in the corporate database for receipt tracking and repeat counter purchases.
        </p>

        {errors.form && (
          <div className="rounded-md bg-red-50 p-2.5 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300">
            {errors.form}
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
            Customer Name <span className="text-red-500">*</span>
          </label>
          <Input
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="e.g. Chief Emeka Nnamani"
            className="w-full"
            autoFocus
          />
          {errors.fullName && <p className="text-xs text-red-600 mt-0.5">{errors.fullName}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Phone Number <span className="text-red-500">*</span>
            </label>
            <Input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 0803 123 4567"
              className="w-full"
            />
            {errors.phone && <p className="text-xs text-red-600 mt-0.5">{errors.phone}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Customer Classification
            </label>
            <select
              value={customerType}
              onChange={(e) => setCustomerType(e.target.value as CustomerType)}
              className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-orange-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              <option value="individual">Homeowner / Individual</option>
              <option value="contractor">Site Contractor / Builder</option>
              <option value="corporate">Corporate / Developer</option>
              <option value="distributor">Wholesale Distributor</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
            Email Address (Optional)
          </label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="e.g. contractor@example.com"
            className="w-full"
          />
          {errors.email && <p className="text-xs text-red-600 mt-0.5">{errors.email}</p>}
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
            Delivery / Site Address (Optional)
          </label>
          <Input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="e.g. Plot 14, Independence Layout, Enugu"
            className="w-full"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={isSubmitting}
            className="bg-orange-600 hover:bg-orange-700 text-white"
          >
            {isSubmitting ? 'Registering...' : 'Save & Select Customer'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
