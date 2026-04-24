import {
  LayoutDashboard,
  MessageSquare,
  GitCompareArrows,
  Layers,
  GitFork,
  Wrench,
  Trophy,
  ShieldCheck,
  Coins,
  Users,
  Plug,
  Cpu,
  Store,
  Route,
  FlaskConical,
  Brain,
  BookOpen,
  FolderOpen,
  Shield,
  ScrollText,
  Activity,
  Settings,
  Workflow,
  CheckSquare,
  Terminal,
  GitBranch,
  Bot,
  Radar,
  KeyRound,
  Globe,
  Search,
  Mail,
  ListTodo,
  Hash,
  FileText,
  Figma,
} from 'lucide-react';

import { ROUTES } from './routes.constants';

export type SidebarItem = {
  labelKey: string;
  href: string;
  icon: typeof MessageSquare;
  badge?: string;
  children?: SidebarItem[];
};

export const SIDEBAR_NAV_ITEMS: SidebarItem[] = [
  { labelKey: 'nav.dashboard', href: ROUTES.DASHBOARD, icon: LayoutDashboard },
  {
    labelKey: 'nav.chat',
    href: ROUTES.CHAT,
    icon: MessageSquare,
    children: [
      { labelKey: 'nav.compareModels', href: ROUTES.CHAT_COMPARE, icon: GitCompareArrows },
      { labelKey: 'nav.consensusMode', href: ROUTES.CHAT_CONSENSUS, icon: Layers },
      { labelKey: 'nav.escalationChain', href: ROUTES.CHAT_ESCALATION, icon: GitFork },
      { labelKey: 'nav.repairLab', href: ROUTES.CHAT_REPAIR, icon: Wrench },
      { labelKey: 'nav.decomposeLab', href: ROUTES.CHAT_DECOMPOSE, icon: Layers },
      { labelKey: 'nav.bestOfNLab', href: ROUTES.CHAT_BEST_OF_N, icon: Trophy },
      { labelKey: 'nav.verifierLab', href: ROUTES.CHAT_VERIFY, icon: ShieldCheck },
      { labelKey: 'nav.pipelineLab', href: ROUTES.CHAT_PIPELINE, icon: Layers },
      { labelKey: 'nav.costEnsemble', href: ROUTES.CHAT_COST_ENSEMBLE, icon: Coins },
      { labelKey: 'nav.rolePackLab', href: ROUTES.CHAT_ROLE_PACK, icon: Users },
    ],
  },
  { labelKey: 'nav.connectors', href: ROUTES.CONNECTORS, icon: Plug },
  {
    labelKey: 'nav.research',
    href: ROUTES.RESEARCH_RUNS,
    icon: Search,
    children: [
      { labelKey: 'nav.researchProviders', href: ROUTES.RESEARCH_PROVIDERS, icon: Globe },
      { labelKey: 'nav.researchRuns', href: ROUTES.RESEARCH_RUNS, icon: Search },
    ],
  },
  {
    labelKey: 'nav.workspace',
    href: ROUTES.WORKSPACE,
    icon: Workflow,
    children: [
      { labelKey: 'nav.workspaceAppConfigs', href: ROUTES.WORKSPACE_APP_CONFIGS, icon: KeyRound },
      { labelKey: 'nav.workspaceActions', href: ROUTES.WORKSPACE_ACTIONS, icon: CheckSquare },
      { labelKey: 'nav.workspaceApprovals', href: ROUTES.WORKSPACE_APPROVALS, icon: CheckSquare },
      { labelKey: 'nav.workspaceSyncHealth', href: ROUTES.WORKSPACE_SYNC_HEALTH, icon: Activity },
      { labelKey: 'nav.workspaceGmail', href: ROUTES.WORKSPACE_GMAIL, icon: Mail },
      { labelKey: 'nav.workspaceJira', href: ROUTES.WORKSPACE_JIRA, icon: ListTodo },
      {
        labelKey: 'nav.workspaceSourceControl',
        href: ROUTES.WORKSPACE_SOURCE_CONTROL,
        icon: GitBranch,
      },
      { labelKey: 'nav.workspaceSlack', href: ROUTES.WORKSPACE_SLACK, icon: Hash },
      { labelKey: 'nav.workspaceDocs', href: ROUTES.WORKSPACE_DOCS, icon: FileText },
      { labelKey: 'nav.workspaceConfluence', href: ROUTES.WORKSPACE_CONFLUENCE, icon: BookOpen },
      { labelKey: 'nav.workspaceFigma', href: ROUTES.WORKSPACE_FIGMA, icon: Figma },
      { labelKey: 'nav.workspaceWorkflows', href: ROUTES.WORKSPACE_WORKFLOWS, icon: Workflow },
    ],
  },
  {
    labelKey: 'nav.agent',
    href: ROUTES.AGENT,
    icon: Bot,
    children: [
      { labelKey: 'nav.agentTerminal', href: ROUTES.AGENT_TERMINAL, icon: Terminal },
      { labelKey: 'nav.agentRepos', href: ROUTES.AGENT_REPOS, icon: GitBranch },
    ],
  },
  {
    labelKey: 'nav.models',
    href: ROUTES.MODELS,
    icon: Cpu,
    children: [
      { labelKey: 'nav.modelCatalog', href: ROUTES.MODELS_CATALOG, icon: Store },
      { labelKey: 'nav.discovery', href: ROUTES.MODELS_DISCOVERY, icon: Radar },
    ],
  },
  {
    labelKey: 'nav.routing',
    href: ROUTES.ROUTING,
    icon: Route,
    children: [
      { labelKey: 'nav.replayLab', href: ROUTES.ROUTING_REPLAY, icon: FlaskConical },
      { labelKey: 'nav.recoveryLab', href: ROUTES.ROUTING_RECOVERY, icon: Activity },
      { labelKey: 'nav.adaptiveInsights', href: ROUTES.ROUTING_ADAPTIVE_INSIGHTS, icon: Brain },
    ],
  },
  { labelKey: 'nav.memory', href: ROUTES.MEMORY, icon: Brain },
  { labelKey: 'nav.context', href: ROUTES.CONTEXT, icon: BookOpen },
  { labelKey: 'nav.files', href: ROUTES.FILES, icon: FolderOpen },
  { labelKey: 'nav.audits', href: ROUTES.AUDITS, icon: Shield },
  { labelKey: 'nav.logs', href: ROUTES.LOGS, icon: ScrollText },
  { labelKey: 'nav.observability', href: ROUTES.OBSERVABILITY, icon: Activity },
  { labelKey: 'nav.settings', href: ROUTES.SETTINGS, icon: Settings },
];
