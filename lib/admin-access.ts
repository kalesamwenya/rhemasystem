export type AdminRole = 'owner' | 'administrator' | 'it' | 'finance' | 'academic' | 'registrar' | 'support' | 'operations';
export type AdminModule =
  | 'dashboard'
  | 'reports'
  | 'admissions'
  | 'partnerships'
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
  | 'budgets'
  | 'assets'
  | 'activity-requests'
  | 'schedule'
  | 'library'
  | 'profile'
  | 'settings'
  | 'tasks'
  | 'staff-access';

const allModules: AdminModule[] = [
  'dashboard', 'reports', 'admissions', 'partnerships', 'students', 'people', 'student-affairs', 'academics',
  'communications', 'contact-messages', 'chatbot', 'social-media', 'events', 'store', 'help-desk', 'tasks',
  'statistics', 'analysis', 'performance', 'finance', 'budgets', 'assets', 'activity-requests', 'schedule', 'library', 'profile', 'settings', 'staff-access',
];

const roleModules: Record<AdminRole, AdminModule[]> = {
  owner: allModules,
  administrator: allModules,
  it: allModules,
  finance: ['dashboard', 'reports', 'finance', 'budgets', 'assets', 'activity-requests', 'store', 'communications', 'profile', 'tasks'],
  academic: ['dashboard', 'reports', 'academics', 'budgets', 'assets', 'student-affairs', 'schedule', 'library', 'communications', 'profile', 'tasks'],
  registrar: ['dashboard', 'reports', 'admissions', 'partnerships', 'students', 'people', 'events', 'budgets', 'assets', 'student-affairs', 'communications', 'profile', 'tasks'],
  support: ['dashboard', 'reports', 'partnerships', 'budgets', 'assets', 'activity-requests', 'communications', 'contact-messages', 'chatbot', 'social-media', 'help-desk', 'profile', 'tasks'],
  operations: ['dashboard', 'reports', 'events', 'budgets', 'assets', 'schedule', 'tasks', 'profile'],
};

const departmentAliases: Record<Exclude<AdminRole, 'owner' | 'administrator' | 'it'>, string[]> = {
  finance: ['finance', 'financial', 'account', 'accounts', 'bursar', 'payments'],
  academic: ['academic', 'academics', 'education', 'lecturer', 'faculty', 'dean'],
  registrar: ['registrar', 'admissions', 'admission', 'records', 'enrollment', 'enrolment', 'student affairs', 'student services'],
  support: ['support', 'communications', 'communication', 'marketing', 'media', 'information technology', 'it', 'help desk'],
  operations: ['operations', 'operation', 'facilities'],
};

function departmentMatchesRole(department: string, role: AdminRole): boolean {
  if (role === 'owner' || role === 'administrator' || role === 'it') return true;
  const normalized = department.trim().toLowerCase().replace(/[_-]+/g, ' ');
  if (!normalized) return false;
  const matchingRoles = (Object.keys(departmentAliases) as Array<keyof typeof departmentAliases>)
    .filter((key) => departmentAliases[key].some((alias) => new RegExp(`(^|[^a-z])${alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z]|$)`).test(normalized)));
  return matchingRoles.length === 0 || (matchingRoles.length === 1 && matchingRoles.includes(role));
}

export function isMediaOrItDepartment(department: string): boolean {
  const normalized = department.trim().toLowerCase().replace(/[_-]+/g, ' ');
  return /(^|[^a-z])(media|information technology|it)([^a-z]|$)/.test(normalized);
}

export function isFinanceDepartment(department: string): boolean {
  const normalized = department.trim().toLowerCase().replace(/[_-]+/g, ' ');
  return /(^|[^a-z])(finance|financial|account|accounts|bursar|payments?)([^a-z]|$)/.test(normalized);
}

export function normalizeAdminRole(value: string): AdminRole | null {
  const role = value.trim().toLowerCase();
  return Object.prototype.hasOwnProperty.call(roleModules, role) ? role as AdminRole : null;
}

export function canAccessAdminModule(roleValue: string, department: string, module: AdminModule): boolean {
  const role = normalizeAdminRole(roleValue);
  if (!role) return false;
  if (module === 'staff-access') return role === 'owner' || role === 'administrator' || role === 'it';
  if (role === 'it') return true;
  if (module === 'budgets' || module === 'assets') return true;
  if (module === 'activity-requests') {
    return role === 'owner' || role === 'administrator'
      || role === 'finance'
      || isFinanceDepartment(department)
      || isMediaOrItDepartment(department);
  }
  if (module === 'social-media' && isMediaOrItDepartment(department)) return true;
  if (!roleModules[role].includes(module)) return false;
  return departmentMatchesRole(department, role);
}

export function getAdminModuleForPath(pathname: string): AdminModule {
  if (pathname === '/admin') return 'dashboard';
  if (pathname.startsWith('/admin/staff-access')) return 'staff-access';
  if (pathname.startsWith('/admin/reports')) return 'reports';
  if (pathname.startsWith('/admin/partnerships') || pathname.startsWith('/admin/partner-applications')) return 'partnerships';
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
  if (pathname.startsWith('/admin/budgets')) return 'budgets';
  if (pathname.startsWith('/admin/assets')) return 'assets';
  if (pathname.startsWith('/admin/activity-requests')) return 'activity-requests';
  if (pathname.startsWith('/admin/expenditures')) return 'finance';
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
    case 'finance':
    case 'academic':
    case 'registrar':
    case 'support':
    case 'operations': return '/admin';
    default: return '/admin';
  }
}
