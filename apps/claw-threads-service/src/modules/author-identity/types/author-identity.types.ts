/** What a reader may see of an author or owner: a name, never an id or an email. */
export type PublicAuthor = {
  username: string;
  displayName: string;
};

/** A profile as auth-service returns it. The id stays inside threads-service. */
export type AuthorProfile = PublicAuthor & { id: string };
