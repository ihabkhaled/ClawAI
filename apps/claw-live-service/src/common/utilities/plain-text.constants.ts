/** A link a model could add: scheme URLs, www. hosts, bare domains with a path. */
export const LINK_PATTERN = /\b(?:[a-z][a-z0-9+.-]*:\/\/|www\.)[^\s"'<>]+/giu;

/** Markup a model could add: HTML tags, markdown links/images, code fences. */
export const MARKUP_PATTERN = /<\/?[a-z][^>]*>|!?\[[^\]]*\]\([^)]*\)|```/giu;
