// konstanta global peran pengguna
export const USER_ROLES = {
  SUPERADMIN: "superadmin",
  ADMIN: "admin",
  STUDENT: "student",
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

// fungsi pembantu untuk pengecekan peran
export const isSuperadmin = (role?: string | null): boolean =>
  role === USER_ROLES.SUPERADMIN;

export const isAdmin = (role?: string | null): boolean =>
  role === USER_ROLES.ADMIN;

export const isStudent = (role?: string | null): boolean =>
  role === USER_ROLES.STUDENT;

export const isManagerRole = (role?: string | null): boolean =>
  role === USER_ROLES.SUPERADMIN || role === USER_ROLES.ADMIN;

// fungsi pembantu untuk menampilkan label peran baku pengguna di antarmuka
export const getRoleLabel = (role?: string | null): string => {
  if (role === USER_ROLES.SUPERADMIN) return "Superadmin";
  if (role === USER_ROLES.ADMIN) return "Admin";
  return "Peserta";
};

