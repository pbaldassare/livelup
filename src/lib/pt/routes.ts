/**
 * Route builders PT web vs PWA app.
 * In /pt/app/* usare sempre ptRoutes.app.
 */

export const ptRoutes = {
  web: {
    home: '/pt',
    athletes: '/pt/athletes',
    athlete: (id: string) => `/pt/athletes/${id}`,
    athleteWorkouts: (id: string) => `/pt/athletes/${id}?tab=workouts`,
    workouts: '/pt/workouts',
    workoutsTab: (tab: string) => `/pt/workouts?tab=${tab}`,
    template: (id: string) => `/pt/templates/${id}`,
    templates: '/pt/workouts',
    exercises: '/pt/exercises',
    chat: (atletaId?: string) =>
      atletaId ? `/pt/messages?athleteId=${atletaId}` : '/pt/messages',
    calendar: '/pt/events',
  },
  app: {
    home: '/pt/app',
    athletes: '/pt/app/athletes',
    athletesInvite: '/pt/app/athletes?invite=1',
    athlete: (id: string) => `/pt/app/athlete/${id}`,
    athleteWorkouts: (id: string) => `/pt/app/athlete/${id}/workouts`,
    workouts: '/pt/app/workouts',
    workoutsTab: (tab: string) => `/pt/app/templates?tab=${tab}`,
    template: (id: string) => `/pt/app/templates/${id}`,
    templates: '/pt/app/templates',
    exercises: '/pt/app/exercises',
    chat: (atletaId?: string) =>
      atletaId ? `/pt/app/chat/${atletaId}` : '/pt/app/chat',
    calendar: '/pt/app/calendar',
  },
} as const;

export type PTRouteSet = typeof ptRoutes.app;

export function ptRoutesForPath(pathname: string): PTRouteSet {
  return pathname.startsWith('/pt/app') ? ptRoutes.app : ptRoutes.web;
}
