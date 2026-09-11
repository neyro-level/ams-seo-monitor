export type NavigationChild = {
  href: string;
  label: string;
  active: boolean;
  muted?: boolean;
};

export type NavigationItem = {
  href: string;
  label: string;
  active: boolean;
  children?: NavigationChild[];
};

export type NavigationSection = {
  title: string;
  items: NavigationItem[];
};
