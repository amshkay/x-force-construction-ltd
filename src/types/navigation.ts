export interface NavItem {
  title: string;
  href: string;
  icon?: string;
  badge?: string | number;
  badgeColor?: 'default' | 'primary' | 'warning' | 'danger';
  roles?: string[]; // Roles permitted to see this nav item
  module?: string; // Module identifier for future module toggling
  children?: NavItem[];
}

export interface BreadcrumbItem {
  label: string;
  href?: string;
  isCurrent?: boolean;
}
