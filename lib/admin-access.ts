export type AdminRole = 'owner' | 'administrator' | 'finance' | 'academic' | 'registrar' | 'support';
export type AdminModule =
  | 'dashboard'
  | 'admissions'
  | 'students'
  | 'people'
  | 'student-affairs'
  | 'academics'
  | 'communications'
  | 'contact-messages'
  | 'chatbot'
  | 'social-media'
  | 'events'
  | 'store'
  | 'help-desk'
  | 'statistics'
  | 'analysis'
  | 'performance'
  | 'finance'
  | 'schedule'
  | 'library'
  | 'profile'
  | 'settings'
  | 'tasks';

const allModules: AdminModule[] = [
  'dashboard', 'admissions', 'students', 'people', 'student-affairs', 'academics',
  'communications', 'contact-messages', 'chatbot', 'social-media', 'events', 'store', 'help-desk', 'tasks',
  'statistics', 'analysis', 'performance', 'finance', 'schedule', 'library', 'profile', 'settings',
];

const roleModules: Record<AdminRole, AdminModule[]> = {
  owner: allModules,
  administrator: allModules,
  finance: ['dashboard', 'finance', 'store', 'statistics', 'communications', 'profile', 'tasks'],
  academic: ['academics', 'student-affairs', 'schedule', 'library', 'communications', 'profile', 'tasks'],
  registrar: ['admissions', 'students', 'people', 'events', 'communications', 'profile', 'tasks'],
  support: ['communications', 'contact-messages', 'chatbot', 'social-media', 'help-desk', 'profile', 'tasks'],
};

const departmentAliases: Record<Exclude<AdminRole, 'owner' | 'administrator'>, string[]> = {
  finance: ['finance', 'financial', 'account', 'accounts', 'bursar', 'payments'],
  academic: ['academic', 'academics', 'education', 'lecturer', 'faculty', 'student affairs', 'student services'],
  registrar: ['registrar', 'admissions', 'admission', 'records', 'enrollment', 'enrolment'],
  support: ['support', 'communications', 'communication', 'marketing', 'information technology', 'it', 'help desk'],
};

function departmentMatchesRole(department: string, role: AdminRole): boolean {
  if (role === 'owner' || role === 'administrator') return true;
  const normalized = department.trim().toLowerCase().replace(/[_-]+/g, ' ');
  if (!normalized) return false;
  const matchingRoles = (Object.keys(departmentAliases) as Array<keyof typeof departmentAliases>)
    .filter((key) => departmentAliases[key].some((alias) => new RegExp(`(^|[^a-z])${alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z]|$)`).test(normalized)));
  return matchingRoles.length === 0 || (matchingRoles.length === 1 && matchingRoles.includes(role));
}

export function normalizeAdminRole(value: string): AdminRole | null {
  const role = value.trim().toLowerCase();
  return Object.prototype.hasOwnProperty.call(roleModules, role) ? role as AdminRole : null;
}

export function canAccessAdminModule(roleValue: string, department: string, module: AdminModule): boolean {
  const role = normalizeAdminRole(roleValue);
  if (!role || !roleModules[role].includes(module)) return false;
  return departmentMatchesRole(department, role);
}

export function getAdminModuleForPath(pathname: string): AdminModule {
  if (pathname === '/admin') return 'dashboard';
  if (pathname.startsWith('/admin/admissions')) return 'admissions';
  if (pathname.startsWith('/admin/students')) return 'students';
  if (pathname.startsWith('/admin/people')) return 'people';
  if (pathname.startsWith('/admin/student-affairs')) return 'student-affairs';
  if (pathname.startsWith('/admin/courses') || pathname.startsWith('/admin/assessments')) return 'academics';
  if (pathname.startsWith('/admin/communications') || pathname.startsWith('/admin/messages') || pathname.startsWith('/admin/notifications') || pathname.startsWith('/admin/alerts')) return 'communications';
  if (pathname.startsWith('/admin/chatbot')) return 'chatbot';
  if (pathname.startsWith('/admin/contact-messages')) return 'contact-messages';
  if (pathname.startsWith('/admin/site-content')) return 'social-media';
  if (pathname.startsWith('/admin/social-media')) return 'social-media';
  if (pathname.startsWith('/admin/events')) return 'events';
  if (pathname.startsWith('/admin/store')) return 'store';
  if (pathname.startsWith('/admin/help-desk')) return 'help-desk';
  if (pathname.startsWith('/admin/statistics')) return 'statistics';
  if (pathname.startsWith('/admin/analysis')) return 'analysis';
  if (pathname.startsWith('/admin/performance-logs')) return 'performance';
  if (pathname.startsWith('/admin/budgets') || pathname.startsWith('/admin/expenditures')) return 'finance';
  if (pathname.startsWith('/admin/payments') || pathname.startsWith('/admin/financials')) return 'finance';
  if (pathname.startsWith('/admin/schedule')) return 'schedule';
  if (pathname.startsWith('/admin/library')) return 'library';
  if (pathname.startsWith('/admin/profile')) return 'profile';
  if (pathname.startsWith('/admin/settings')) return 'settings';
  if (pathname.startsWith('/admin/tasks')) return 'tasks';
  return 'settings';
}

export function getAdminLandingPath(roleValue: string): string {
  switch (normalizeAdminRole(roleValue)) {
    case 'finance': return '/admin/payments';
    case 'academic': return '/admin/courses';
    case 'registrar': return '/admin/admissions';
    case 'support': return '/admin/communications';
    default: return '/admin';
  }
}
