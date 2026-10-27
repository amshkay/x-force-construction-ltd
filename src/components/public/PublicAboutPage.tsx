import React from 'react';
import { PageHeader } from '../ui/PageHeader';
import { useBusinessSettings } from '../../hooks/useBusinessSettings';
import { ShieldCheck, Award, Factory, Users } from 'lucide-react';
import { Card, CardContent } from '../ui/Card';

export interface PublicAboutPageProps {
  onBackHome?: () => void;
}

export const PublicAboutPage: React.FC<PublicAboutPageProps> = ({ onBackHome }) => {
  const { publicSettings } = useBusinessSettings();

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 text-left space-y-10">
      <PageHeader
        title={`About ${publicSettings.legalName}`}
        description={`The manufacturer and engineering team behind ${publicSettings.publicBrandName}.`}
        breadcrumbItems={[
          { label: 'Home', onClick: onBackHome },
          { label: 'About Us', isCurrent: true },
        ]}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        <div className="space-y-4 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">
            Building Excellence. Finishing with Pride.
          </h3>
          <p>
            {publicSettings.legalName} is an incorporated construction and specialized masonry enterprise{publicSettings.tinNumber ? ` (TIN/RC: ${publicSettings.tinNumber})` : ''}. Under our premier public brand, <strong>{publicSettings.publicBrandName}</strong>, we engineer high-density interlocking bricks and high-load pavers engineered to exceed standard compression specs.
          </p>
          <p>
            Our manufacturing facility utilizes computer-controlled hydraulic compression presses, calibrated aggregate grading, and moisture-controlled curing techniques. By eliminating the necessity of continuous mortar joints, our interlocking masonry enables faster construction speeds, lower thermal transmission, and distinctive architectural finishes.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-4 text-left">
              <Factory className="h-6 w-6 text-orange-600 mb-2" />
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">Industrial Plant</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">High-volume hydraulic compression presses</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-left">
              <ShieldCheck className="h-6 w-6 text-orange-600 mb-2" />
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">Quality Assured</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">Hydraulic compression batch testing</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-left">
              <Award className="h-6 w-6 text-orange-600 mb-2" />
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">Eco Standards</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">Sustainable stabilized soil technology</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-left">
              <Users className="h-6 w-6 text-orange-600 mb-2" />
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">Trained Masons</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">Certified on-site laying technicians</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
