export const systemStats = ['modules', 'roles', 'languages', 'devices'] as const;

export const systemRoles = [
  { id: 'superAdmin', icon: 'ri-shield-star-line' },
  { id: 'admin', icon: 'ri-user-settings-line' },
  { id: 'teacher', icon: 'ri-user-star-line' },
  { id: 'accountant', icon: 'ri-calculator-line' },
  { id: 'student', icon: 'ri-graduation-cap-line' },
  { id: 'parent', icon: 'ri-parent-line' },
  { id: 'receptionist', icon: 'ri-customer-service-line' },
  { id: 'librarian', icon: 'ri-book-shelf-line' },
] as const;

export const systemModuleGroups = [
  {
    id: 'academics',
    icon: 'ri-graduation-cap-line',
    modules: [
      { id: 'admissions', icon: 'ri-user-add-line' },
      { id: 'students', icon: 'ri-group-line' },
      { id: 'timetable', icon: 'ri-calendar-2-line' },
      { id: 'attendance', icon: 'ri-checkbox-multiple-line' },
      { id: 'exams', icon: 'ri-file-list-3-line' },
    ],
  },
  {
    id: 'teaching',
    icon: 'ri-presentation-line',
    modules: [
      { id: 'homework', icon: 'ri-edit-2-line' },
      { id: 'teacherMode', icon: 'ri-shield-user-line' },
      { id: 'calendar', icon: 'ri-calendar-todo-line' },
      { id: 'timeline', icon: 'ri-time-line' },
      { id: 'history', icon: 'ri-history-line' },
    ],
  },
  {
    id: 'finance',
    icon: 'ri-wallet-3-line',
    modules: [
      { id: 'fees', icon: 'ri-file-text-line' },
      { id: 'receipts', icon: 'ri-receipt-line' },
      { id: 'payroll', icon: 'ri-bank-card-line' },
      { id: 'hr', icon: 'ri-team-line' },
      { id: 'reports', icon: 'ri-bar-chart-box-line' },
    ],
  },
  {
    id: 'operations',
    icon: 'ri-settings-3-line',
    modules: [
      { id: 'frontOffice', icon: 'ri-customer-service-2-line' },
      { id: 'documents', icon: 'ri-award-line' },
      { id: 'library', icon: 'ri-book-2-line' },
      { id: 'cms', icon: 'ri-pages-line' },
      { id: 'permissions', icon: 'ri-lock-2-line' },
    ],
  },
] as const;

export const systemHowSteps = ['1', '2', '3'] as const;

export const systemPoints = ['1', '2', '3', '4'] as const;

export const systemSecurityPoints = ['records', 'audit', 'accounts'] as const;

export const systemImages = {
  banner:
    'https://readdy.ai/api/search-image?query=Abstract%20editorial%20scene%20of%20a%20school%20administration%20workspace%20with%20layered%20cream%20paper%20documents%20crimson%20red%20folder%20accents%20and%20warm%20golden%20light%2C%20stylized%20flat%20geometry%2C%20soft%20shadows%2C%20calm%20minimal%20composition%2C%20high%20detail&width=1600&height=900&seq=system-banner-2026&orientation=landscape',
  dashboard:
    'https://readdy.ai/api/search-image?query=Clean%20stylized%20school%20management%20dashboard%20on%20a%20laptop%20screen%20with%20warm%20cream%20background%2C%20crimson%20red%20accent%20charts%20and%20attendance%20cards%2C%20minimal%20editorial%20product%20photography%2C%20soft%20natural%20light%2C%20organized%20layout%2C%20high%20detail&width=1200&height=800&seq=system-dashboard-2026&orientation=landscape',
};