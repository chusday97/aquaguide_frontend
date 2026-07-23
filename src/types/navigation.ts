export type WorkspaceSectionId =
  | 'aquarium-overview'
  | 'aquarium-actions'
  | 'aquarium-tank'
  | 'aquarium-records'
  | 'aquarium-discovery'
  | 'atlas-toolbar'
  | 'atlas-results'
  | 'atlas-grid'
  | 'atlas-pagination-bottom'
  | 'calculator-sticky-target'
  | 'compatibility-calculator'
  | 'care-search'
  | 'care-categories'
  | 'care-recommendations'
  | 'care-results'
  | 'care-diagnosis'
  | 'care-actions';

export type WorkspaceNavigationContext = {
  route: string;
  query: string;
  hash: string;
  scrollTop: number;
  sourceId?: string;
};

export type NavigateToSectionOptions = {
  path?: string;
  behavior?: ScrollBehavior;
  updateHash?: boolean;
};
