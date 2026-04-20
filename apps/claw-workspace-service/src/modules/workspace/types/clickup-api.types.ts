export type ClickUpTeam = {
  id: string;
  name: string;
};

export type ClickUpTeamsResponse = {
  teams: ClickUpTeam[];
};

export type ClickUpSpace = {
  id: string;
  name: string;
};

export type ClickUpSpacesResponse = {
  spaces: ClickUpSpace[];
};

export type ClickUpList = {
  id: string;
  name: string;
  task_count?: number;
};

export type ClickUpListsResponse = {
  lists: ClickUpList[];
};

export type ClickUpTask = {
  id: string;
  name: string;
  text_content?: string | null;
  description?: string | null;
  status: { status: string };
  url: string;
  creator?: { username?: string; id?: number };
  date_created: string;
  date_updated: string;
  list?: { id: string; name: string };
};

export type ClickUpTasksResponse = {
  tasks: ClickUpTask[];
};

export type ClickUpTokenResponse = {
  access_token: string;
};
