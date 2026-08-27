import type { CodingAgentDictionary } from '@/types/coding-agent-content.types';

/**
 * 两个「编码代理」页面的简体中文文案。
 *
 * 这里的每一条说法都来自扩展自身的 README 与清单（`apps/claw-coding-agent`），
 * 而不是营销愿望。该扩展是一个瘦客户端——身份认证、权益、配额、历史记录、供应商
 * 凭据、路由与推理都留在平台上——文案也照实这样写，因为一个抱着「离线编码模型」
 * 的期待来安装它的开发者，一分钟之内就会把它卸载。
 */
export const ZH_CODING_AGENT_CONTENT: CodingAgentDictionary = {
  overview: {
    eyebrow: 'ClawAI，就在你的编辑器里',
    title: '面向 VS Code 的 ClawAI 编码代理',
    intro:
      '你的 ClawAI 订阅里的每一个模型，都在你已经在用的编辑器里。该扩展是一个瘦客户端：你的账号、配额、供应商凭据与对话历史都留在平台上，因此你在浏览器里开始的那段对话，可以在 VS Code 里接着聊。',
    installCta: '从 Marketplace 安装',
    marketplaceCta: '在 Marketplace 中查看',
    capabilitiesTitle: '它能做什么',
    capabilities: [
      {
        title: '一份订阅，所有模型',
        body: '九大前沿模型家族，加上你本地的开源权重模型，都能从编辑器里直接使用，无需粘贴任何 API 密钥。路由在平台上完成，编辑器因此从不持有供应商凭据。',
      },
      {
        title: '自动路由，或手动指定',
        body: '让路由器为每条消息挑选模型，或者把一段对话固定到某个具体模型。这个选择与网页端完全一致，因为它就是在同一个地方做出的。',
      },
      {
        title: '在编辑器里对比与评判',
        body: '把同一条提示同时发给多个模型，把回答并排读完，还可以选做一次评判——与网页端相同的对比流程，只不过面对的是你正打开的代码。',
      },
      {
        title: '先预览，再应用',
        body: '改动以可审阅的 diff 形式呈现，而不是悄悄写入。在你接受之前，没有任何内容会碰到你的工作树。',
      },
      {
        title: '可以查看的上下文',
        body: '每个回答都带着一份用量记录：读了哪些文件、由哪个模型作答、消耗了多少额度。当回答不对时，你能看清它当时看的是什么。',
      },
      {
        title: '多个对话并行',
        body: '同时打开多个带标题的聊天标签页，其中两个可以同时向不同的模型运行，后端的历史记录会原地恢复。',
      },
    ],
    requirementsTitle: '你需要什么',
    requirementsBody:
      'VS Code 1.98 或更高版本，以及一个 ClawAI 账号。扩展既可以连接 ClawAI 的托管平台，也可以连接你自己的自托管部署——在登录时由你选择。',
    faqTitle: '大家常问的问题',
    faq: [
      {
        question: '使用扩展需要另外订阅吗？',
        answer:
          '不需要。扩展使用你已有的 ClawAI 账号，消耗的也是与网页端相同的那份额度。没有任何额外要买的东西。',
      },
      {
        question: '我的代码会被发送给模型供应商吗？',
        answer:
          '只发送一次请求所需要的内容，而且只发给作答的那个模型——每个回答的用量记录都会写明是哪一个。把对话固定到本地的开源权重模型，或者让扩展指向自托管部署，就不会有任何内容到达外部供应商。',
      },
      {
        question: '它能配合自托管的 ClawAI 使用吗？',
        answer:
          '可以。扩展在登录时会询问后端 URL，因此它既能对接 ClawAI 的托管平台，也能对接完全跑在你自己基础设施上的实例。',
      },
      {
        question: '我还能同时继续用网页端吗？',
        answer:
          '可以，而且两边看到的是同样的对话。历史记录存放在平台上，因此在浏览器里开始的一段对话可以在编辑器里接着聊，再切回去也一样。',
      },
    ],
  },
  install: {
    eyebrow: '安装',
    title: '安装 ClawAI 编码代理',
    intro:
      '三个步骤，大约一分钟。该扩展发布在 Visual Studio Marketplace 上，发布者是已通过验证的 ClawAI。',
    stepsTitle: '在 VS Code 内安装',
    steps: [
      {
        title: '打开扩展视图',
        body: '在 Windows 和 Linux 上按 Ctrl+Shift+X，在 macOS 上按 Cmd+Shift+X。你也可以从左侧的活动栏打开它。',
      },
      {
        title: '搜索 ClawAI Coding Agent',
        body: '在搜索框里输入「ClawAI」。找到发布者为 ClawAI 的那一条——发布者名称带有已验证徽章。',
      },
      {
        title: '安装并登录',
        body: '点击「安装」，然后打开 ClawAI 面板并登录。系统会询问你的后端 URL——保持默认即可使用 ClawAI 的托管平台，若你自托管，就填入你自己的地址。',
      },
    ],
    cliTitle: '从命令行安装',
    cliBody:
      '如果你习惯在终端或安装脚本里装扩展，一条命令就够了。只要 `code` 命令在你的 PATH 中，它在哪里都能用。',
    signInTitle: '关于登录',
    signInBody:
      '登录在你的浏览器中完成，随后把一个受限范围的令牌交回编辑器。扩展从不保存你的密码，也从不持有模型供应商的 API 密钥——它们都留在平台上。',
    troubleshootingTitle: '如果出了问题',
    troubleshooting: [
      {
        question: '搜索里找不到这个扩展',
        answer:
          '检查你的 VS Code 版本——该扩展需要 1.98 或更高版本。在更旧的版本上，Marketplace 会把它隐藏起来，而不是提供一个不兼容的安装。',
      },
      {
        question: '一键安装链接点了没反应',
        answer:
          '一键安装链接使用 `vscode:` 协议，只有当你浏览网页的这台机器上装了 VS Code 时它才有效。改用 Marketplace 页面或命令行即可。',
      },
      {
        question: '登录成功，却列不出任何模型',
        answer:
          '模型访问权限取决于你的方案。到网页端的模型页面看一下；如果那里同样看不到某个模型，说明它没有对你的账号开放，而不是扩展少了它。',
      },
      {
        question: '连不上我的自托管部署',
        answer:
          '后端 URL 必须能从你的机器访问到，并且必须提供一份你的编辑器信任的证书。浏览器在弹出警告后接受的自签名证书，在这里仍然会被拒绝。',
      },
    ],
    marketplaceCta: '打开 Marketplace 页面',
    openInEditorCta: '在 VS Code 中打开',
  },
};
