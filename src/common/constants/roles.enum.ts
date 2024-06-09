export enum ROLE {
  ADMIN = 'ADMIN',
  USER = 'USER',
  GUEST = 'CLIENT',
}


export const roleHierarchy: Record<ROLE, ROLE[]> = {
  [ROLE.GUEST]: [ROLE.USER, ROLE.GUEST],
  [ROLE.USER]: [ROLE.USER],
  [ROLE.ADMIN]: [ROLE.USER, ROLE.GUEST, ROLE.ADMIN],
};
