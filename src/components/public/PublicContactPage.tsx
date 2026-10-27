import React, { useState } from 'react';
import { PageHeader } from '../ui/PageHeader';
import { FormField } from '../ui/FormField';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Button } from '../ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { useBusinessSettings } from '../../hooks/useBusinessSettings';
import { Phone, Mail, MapPin, Clock, Send, CheckCircle2 } from 'lucide-react';
import { useToast } from '../ui/Toast';

export interface PublicContactPageProps {
  onBackHome?: () => void;
}

export const PublicContactPage: React.FC<PublicContactPageProps> = ({ onBackHome }) => {
  const toast = useToast();
  const { publicSettings } = useBusinessSettings();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) {
      toast.error('Please provide your name and phone number.', 'Missing Information');
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitted(true);
      toast.success(
        `Thank you! Your message has been received by ${publicSettings.publicBrandName} customer support.`,
        'Message Dispatched'
      );
    }, 800);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 text-left space-y-8">
      <PageHeader
        title="Contact & Technical Sales"
        description="Speak with our construction materials team for product pricing, site deliveries, and laying service bookings."
        breadcrumbItems={[
          { label: 'Home', onClick: onBackHome },
          { label: 'Contact Us', isCurrent: true },
        ]}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Contact Form */}
        <div className="md:col-span-2">
          <Card>
            <CardHeader className="p-5 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-base font-bold">Send an Inquiry</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {submitted ? (
                <div className="py-12 text-center space-y-3">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <h4 className="text-base font-bold text-slate-900 dark:text-white">
                    Inquiry Received
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                    An {publicSettings.publicBrandName} sales engineer will call or WhatsApp you within business hours.
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSubmitted(false);
                      setName('');
                      setPhone('');
                      setEmail('');
                      setMessage('');
                    }}
                  >
                    Send Another Inquiry
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField label="Full Name" required htmlFor="contact-name">
                      <Input
                        id="contact-name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Engr. Babatunde Ade"
                        required
                      />
                    </FormField>

                    <FormField label="Phone / WhatsApp Number" required htmlFor="contact-phone">
                      <Input
                        id="contact-phone"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+234 800 000 0000"
                        required
                      />
                    </FormField>
                  </div>

                  <FormField label="Email Address (Optional)" htmlFor="contact-email">
                    <Input
                      id="contact-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="client@example.com"
                    />
                  </FormField>

                  <FormField label="Project Details or Message" htmlFor="contact-message">
                    <Textarea
                      id="contact-message"
                      rows={4}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Describe your site location, material quantities needed, or questions..."
                    />
                  </FormField>

                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    isLoading={isSubmitting}
                    rightIcon={<Send className="h-3.5 w-3.5" />}
                  >
                    Submit Inquiry
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Direct Contact Info Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="p-4 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-sm font-bold">Office & Yard</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4 text-xs">
              <div className="flex items-start gap-2.5">
                <MapPin className="h-4 w-4 text-orange-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">Factory Yard</p>
                  <p className="text-slate-500 mt-0.5">
                    {publicSettings.contact.address.street},{' '}
                    {publicSettings.contact.address.city},{' '}
                    {publicSettings.contact.address.state}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <Phone className="h-4 w-4 text-orange-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">Direct Telephone</p>
                  <p className="text-slate-500 mt-0.5">{publicSettings.contact.phone}</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <Mail className="h-4 w-4 text-orange-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">Email Inquiries</p>
                  <p className="text-slate-500 mt-0.5">{publicSettings.contact.email}</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                <Clock className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">Operating Hours</p>
                  <p className="text-slate-500 mt-0.5">
                    Mon – Fri: {publicSettings.operatingHoursFormatted.weekdays}
                  </p>
                  <p className="text-slate-500">
                    Sat: {publicSettings.operatingHoursFormatted.saturdays}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
