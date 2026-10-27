import React, { useState } from 'react';
import {
  User,
  Lock,
  Mail,
  Phone,
  Building,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  ArrowLeft,
  Eye,
  EyeOff,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { PageHeader } from '../ui/PageHeader';
import { useBusinessSettings } from '../../hooks/useBusinessSettings';
import { useToast } from '../ui/Toast';
import { localStore } from '../../lib/storage/localStorage';
import { getSupabaseClient } from '../../lib/supabase/client';
import { appConfig } from '../../config/app.config';
import { customerService } from '../../services/customer.service';

export interface PublicCustomerAuthPageProps {
  initialMode?: 'login' | 'register';
  onBackHome?: () => void;
  onNavigateToStaff?: () => void;
  onSuccess?: (customerData: any) => void;
}

const CUSTOMER_SESSION_KEY = 'xforce_customer_session';

export const PublicCustomerAuthPage: React.FC<PublicCustomerAuthPageProps> = ({
  initialMode = 'login',
  onBackHome,
  onNavigateToStaff,
  onSuccess,
}) => {
  const { publicSettings } = useBusinessSettings();
  const toast = useToast();

  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [clientType, setClientType] = useState('Homeowner / Private Builder');
  const [companyName, setCompanyName] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.warning('Please enter both email and password.', 'Sign In');
      return;
    }

    setIsLoading(true);

    try {
      if (appConfig.supabase.isConfigured) {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password.trim(),
        });

        if (error) {
          throw error;
        }

        // Link or retrieve authoritative customer record
        let customerRecord = null;
        try {
          customerRecord = await customerService.getOrCreateCustomerForAuthUser(
            data.user.id,
            data.user.email || email.trim(),
            {
              fullName: data.user.user_metadata?.full_name,
              phone: data.user.user_metadata?.phone,
            }
          );
        } catch (linkErr) {
          console.warn('[PublicCustomerAuth] Could not link customer record:', linkErr);
        }

        const customerSession = {
          email: data.user.email,
          id: data.user.id,
          customerId: customerRecord?.id,
          customerNumber: customerRecord?.customerNumber,
          name: customerRecord?.fullName || data.user.user_metadata?.full_name || email.split('@')[0],
          isLoggedIn: true,
        };
        localStore.set(CUSTOMER_SESSION_KEY, customerSession);
        toast.success(`Welcome back, ${customerSession.name}!`, 'Customer Portal');
        onSuccess && onSuccess(customerSession);
      } else {
        // Safe offline/local simulation with authoritative customer record
        let customerRecord = null;
        try {
          customerRecord = await customerService.getOrCreateCustomerForAuthUser(
            'cust-local-mock-id',
            email.trim(),
            {
              fullName: email.split('@')[0],
            }
          );
        } catch (e) {
          // ignore
        }

        const customerSession = {
          email: email.trim(),
          name: customerRecord?.fullName || email.split('@')[0],
          customerId: customerRecord?.id,
          customerNumber: customerRecord?.customerNumber,
          isLoggedIn: true,
        };
        localStore.set(CUSTOMER_SESSION_KEY, customerSession);
        toast.success('Signed in to customer account.', 'Customer Portal');
        onSuccess && onSuccess(customerSession);
      }
    } catch (err: any) {
      toast.error(err.message || 'Invalid email or password.', 'Sign In Failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || !phone.trim() || !password.trim()) {
      toast.warning('Please fill in all required fields.', 'Registration Notice');
      return;
    }

    if (password.length < 6) {
      toast.warning('Password must be at least 6 characters.', 'Security');
      return;
    }

    setIsLoading(true);

    try {
      if (appConfig.supabase.isConfigured) {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password: password.trim(),
          options: {
            data: {
              full_name: fullName.trim(),
              phone: phone.trim(),
              client_type: clientType,
              company_name: companyName.trim() || undefined,
              role: 'customer',
            },
          },
        });

        if (error) throw error;

        // Create authoritative customer profile linked to this user
        let customerRecord = null;
        if (data.user?.id) {
          try {
            customerRecord = await customerService.getOrCreateCustomerForAuthUser(
              data.user.id,
              email.trim(),
              {
                fullName: fullName.trim(),
                phone: phone.trim(),
                clientType,
                companyName: companyName.trim() || undefined,
              }
            );
          } catch (createErr) {
            console.warn('[PublicCustomerAuth] Could not create customer profile:', createErr);
          }
        }

        const customerSession = {
          email: email.trim(),
          name: customerRecord?.fullName || fullName.trim(),
          id: data.user?.id,
          customerId: customerRecord?.id,
          customerNumber: customerRecord?.customerNumber,
          isLoggedIn: true,
        };
        localStore.set(CUSTOMER_SESSION_KEY, customerSession);
        toast.success('Customer account created successfully!', 'Welcome');
        onSuccess && onSuccess(customerSession);
      } else {
        // Safe offline registration
        let customerRecord = null;
        try {
          customerRecord = await customerService.createCustomer({
            fullName: fullName.trim(),
            email: email.trim(),
            phone: phone.trim(),
            companyName: companyName.trim() || null,
            accountStatus: 'active',
            registrationSource: 'portal',
          });
        } catch (e) {
          // ignore
        }

        const customerSession = {
          email: email.trim(),
          name: customerRecord?.fullName || fullName.trim(),
          phone: phone.trim(),
          customerId: customerRecord?.id,
          customerNumber: customerRecord?.customerNumber,
          isLoggedIn: true,
        };
        localStore.set(CUSTOMER_SESSION_KEY, customerSession);
        toast.success('Customer account registered.', 'Welcome');
        onSuccess && onSuccess(customerSession);
      }
    } catch (err: any) {
      toast.error(err.message || 'Registration could not be completed.', 'Registration Error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-12 text-left space-y-6" id="public-customer-auth">
      {/* Top Breadcrumb & Switcher */}
      <div className="flex items-center justify-between">
        {onBackHome && (
          <button
            type="button"
            onClick={onBackHome}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-white transition"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Home</span>
          </button>
        )}

        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
          <button
            type="button"
            onClick={() => setMode('login')}
            className={`rounded-md px-3 py-1 text-xs font-semibold transition ${
              mode === 'login'
                ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => setMode('register')}
            className={`rounded-md px-3 py-1 text-xs font-semibold transition ${
              mode === 'register'
                ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
            }`}
          >
            Create Account
          </button>
        </div>
      </div>

      {/* Main Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-6">
        <div className="text-center space-y-1">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-orange-100 text-orange-600 dark:bg-orange-950 dark:text-orange-400 mx-auto mb-2">
            <User className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            {mode === 'login' ? 'Customer Account Sign In' : 'Create Customer Account'}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {mode === 'login'
              ? `Access your saved quotations, order history, and dispatch tracking with ${publicSettings.publicBrandName}.`
              : 'Register to manage project quotations, direct factory orders, and site delivery receipts.'}
          </p>
        </div>

        {/* Login Form */}
        {mode === 'login' ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Email Address
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Password
                </label>
                <span className="text-[11px] text-orange-600 dark:text-orange-400 hover:underline cursor-pointer">
                  Forgot Password?
                </span>
              </div>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isLoading}
              className="w-full"
              rightIcon={<ArrowRight className="h-4 w-4" />}
            >
              Sign In to Account
            </Button>
          </form>
        ) : (
          /* Register Form */
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Full Name / Contact Person <span className="text-red-500">*</span>
              </label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Arc. Babatunde Adeyemi"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="client@example.com"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Phone / WhatsApp <span className="text-red-500">*</span>
                </label>
                <Input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+234 803 000 0000"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Customer Profile Type
              </label>
              <select
                value={clientType}
                onChange={(e) => setClientType(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:outline-none focus:border-orange-500"
              >
                <option value="Homeowner / Private Builder">Homeowner / Private Builder</option>
                <option value="Building Contractor">Building Contractor / Mason</option>
                <option value="Architect / Civil Engineer">Architect / Civil Engineer</option>
                <option value="Real Estate Developer">Real Estate Developer / Estate Manager</option>
                <option value="Government / Institutional">Government / Institutional Buyer</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Company or Firm Name (Optional)
              </label>
              <Input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. Apex Engineering Ltd"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Create Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isLoading}
              className="w-full"
              rightIcon={<ArrowRight className="h-4 w-4" />}
            >
              Complete Registration
            </Button>
          </form>
        )}

        {/* Clear Separation Note: Staff vs Customer */}
        <div className="border-t border-slate-100 dark:border-slate-800 pt-4 text-center">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            XFORCE Staff or Site Engineer?{' '}
            <button
              type="button"
              onClick={onNavigateToStaff}
              className="font-semibold text-orange-600 hover:underline dark:text-orange-400"
            >
              Sign in to Staff Console →
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};
