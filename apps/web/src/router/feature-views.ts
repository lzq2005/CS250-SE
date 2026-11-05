import type { Component, InjectionKey } from 'vue';

// Component outlet only: does not register paths or pass routing to another owner.
// Production starts empty until D's data/page adapter is ready. Test fixtures are
// provided by test entry points only, never imported into the production App.
export type ShellFeatureViews = Partial<Record<'map' | 'trips', Component>>;
export const shellFeatureViewsKey: InjectionKey<ShellFeatureViews> = Symbol('shell-feature-views');
