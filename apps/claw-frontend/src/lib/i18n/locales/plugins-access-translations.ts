import { Locale } from '@/enums/locale.enum';
import type { PluginsAccessLocaleTranslation } from '@/types/i18n.types';

/**
 * Plugins and MCP access: the sidebar entries, the plan-editor gate and caps, and the
 * upgrade label. One file imported by every locale, so a missing locale is a type error
 * rather than a raw key (`t()` takes a plain string).
 */
export const PLUGINS_ACCESS_TRANSLATIONS: Record<Locale, PluginsAccessLocaleTranslation> = {
  [Locale.EN]: {
    nav: { plugins: 'Plugins', adminPlugins: 'Manage plugins' },
    planGate: { allowPlugins: 'Plugins and MCP' },
    planForm: {
      maxInstalledPlugins: 'Max installed plugins',
      maxUserMcpServers: 'Max own MCP servers',
    },
    upgradeFeature: 'Plugins',
  },
  [Locale.AR]: {
    nav: { plugins: 'الإضافات', adminPlugins: 'إدارة الإضافات' },
    planGate: { allowPlugins: 'الإضافات وMCP' },
    planForm: {
      maxInstalledPlugins: 'الحد الأقصى للإضافات المثبّتة',
      maxUserMcpServers: 'الحد الأقصى لخوادم MCP الخاصة',
    },
    upgradeFeature: 'الإضافات',
  },
  [Locale.DE]: {
    nav: { plugins: 'Plugins', adminPlugins: 'Plugins verwalten' },
    planGate: { allowPlugins: 'Plugins und MCP' },
    planForm: {
      maxInstalledPlugins: 'Max. installierte Plugins',
      maxUserMcpServers: 'Max. eigene MCP-Server',
    },
    upgradeFeature: 'Plugins',
  },
  [Locale.ES]: {
    nav: { plugins: 'Complementos', adminPlugins: 'Gestionar complementos' },
    planGate: { allowPlugins: 'Complementos y MCP' },
    planForm: {
      maxInstalledPlugins: 'Máx. de complementos instalados',
      maxUserMcpServers: 'Máx. de servidores MCP propios',
    },
    upgradeFeature: 'Complementos',
  },
  [Locale.FA]: {
    nav: { plugins: 'افزونه‌ها', adminPlugins: 'مدیریت افزونه‌ها' },
    planGate: { allowPlugins: 'افزونه‌ها و MCP' },
    planForm: {
      maxInstalledPlugins: 'حداکثر افزونه‌های نصب‌شده',
      maxUserMcpServers: 'حداکثر سرورهای MCP شخصی',
    },
    upgradeFeature: 'افزونه‌ها',
  },
  [Locale.FR]: {
    nav: { plugins: 'Plugins', adminPlugins: 'Gérer les plugins' },
    planGate: { allowPlugins: 'Plugins et MCP' },
    planForm: {
      maxInstalledPlugins: 'Nombre max. de plugins installés',
      maxUserMcpServers: 'Nombre max. de serveurs MCP personnels',
    },
    upgradeFeature: 'Plugins',
  },
  [Locale.HI]: {
    nav: { plugins: 'प्लगइन', adminPlugins: 'प्लगइन प्रबंधित करें' },
    planGate: { allowPlugins: 'प्लगइन और MCP' },
    planForm: {
      maxInstalledPlugins: 'अधिकतम इंस्टॉल किए गए प्लगइन',
      maxUserMcpServers: 'अधिकतम अपने MCP सर्वर',
    },
    upgradeFeature: 'प्लगइन',
  },
  [Locale.IT]: {
    nav: { plugins: 'Plugin', adminPlugins: 'Gestisci plugin' },
    planGate: { allowPlugins: 'Plugin e MCP' },
    planForm: {
      maxInstalledPlugins: 'Max plugin installati',
      maxUserMcpServers: 'Max server MCP personali',
    },
    upgradeFeature: 'Plugin',
  },
  [Locale.JA]: {
    nav: { plugins: 'プラグイン', adminPlugins: 'プラグインを管理' },
    planGate: { allowPlugins: 'プラグインと MCP' },
    planForm: {
      maxInstalledPlugins: 'インストール可能なプラグインの上限',
      maxUserMcpServers: '自分の MCP サーバーの上限',
    },
    upgradeFeature: 'プラグイン',
  },
  [Locale.PT]: {
    nav: { plugins: 'Plugins', adminPlugins: 'Gerir plugins' },
    planGate: { allowPlugins: 'Plugins e MCP' },
    planForm: {
      maxInstalledPlugins: 'Máx. de plugins instalados',
      maxUserMcpServers: 'Máx. de servidores MCP próprios',
    },
    upgradeFeature: 'Plugins',
  },
  [Locale.RU]: {
    nav: { plugins: 'Плагины', adminPlugins: 'Управление плагинами' },
    planGate: { allowPlugins: 'Плагины и MCP' },
    planForm: {
      maxInstalledPlugins: 'Макс. установленных плагинов',
      maxUserMcpServers: 'Макс. собственных MCP-серверов',
    },
    upgradeFeature: 'Плагины',
  },
  [Locale.TH]: {
    nav: { plugins: 'ปลั๊กอิน', adminPlugins: 'จัดการปลั๊กอิน' },
    planGate: { allowPlugins: 'ปลั๊กอินและ MCP' },
    planForm: {
      maxInstalledPlugins: 'จำนวนปลั๊กอินที่ติดตั้งได้สูงสุด',
      maxUserMcpServers: 'จำนวนเซิร์ฟเวอร์ MCP ของตนเองสูงสุด',
    },
    upgradeFeature: 'ปลั๊กอิน',
  },
  [Locale.ZH]: {
    nav: { plugins: '插件', adminPlugins: '管理插件' },
    planGate: { allowPlugins: '插件和 MCP' },
    planForm: {
      maxInstalledPlugins: '已安装插件上限',
      maxUserMcpServers: '自有 MCP 服务器上限',
    },
    upgradeFeature: '插件',
  },
};
