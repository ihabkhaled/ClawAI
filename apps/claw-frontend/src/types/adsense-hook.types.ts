export type UseAdSenseScriptReturn = {
  shouldLoad: boolean;
  clientId: string | null;
};

export type UseAdUnitReturn = {
  shouldRender: boolean;
  clientId: string | null;
  insRef: React.RefObject<HTMLModElement | null>;
};
